import { Server as HttpServer } from "http";
import { Server as SocketServer, Socket } from "socket.io";
import { JwtUtils } from "./jwt";
import { prisma } from "../config/prisma";

export type TAuthSocket = Socket & {
  user?: {
    id: string;
    email: string;
    role: string;
    name: string;
  };
};

let io: SocketServer;

export const initSocket = (httpServer: HttpServer): SocketServer => {
  io = new SocketServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
    pingTimeout: 60000,
  });

  // ─── Auth Middleware ───────────────────────────
  io.use(async (socket: TAuthSocket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.split(" ")[1];

      if (!token) {
        return next(new Error("Authentication token missing"));
      }

      const decoded = JwtUtils.verify(token);

      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { id: true, name: true, email: true, role: true, isActive: true },
      });

      if (!user || !user.isActive) {
        return next(new Error("User not found or inactive"));
      }

      socket.user = user;
      next();
    } catch {
      next(new Error("Invalid or expired token"));
    }
  });

  // ─── Connection Handler ────────────────────────
  io.on("connection", (socket: TAuthSocket) => {
    const user = socket.user!;
    console.log(`✅ Socket connected: ${user.name} (${user.role})`);

    // Join personal room (for private notifications)
    socket.join(`user:${user.id}`);

    // Join role room
    socket.join(`role:${user.role}`);

    // Join admin room if admin
    if (user.role === "ADMIN") {
      socket.join("admin");
    }

    // Join global room
    socket.join("global");

    // ─── Join Mess Room ──────────────────────────
    socket.on("mess:join", async (messId: string) => {
      try {
        const hasAccess = await checkMessAccess(user.id, user.role, messId);
        if (!hasAccess) {
          socket.emit("error", { message: "No access to this mess" });
          return;
        }
        socket.join(`mess:${messId}`);
        socket.emit("mess:joined", { messId });

        // Notify others in the mess
        socket.to(`mess:${messId}`).emit("user:online", {
          userId: user.id,
          name: user.name,
          role: user.role,
        });
      } catch {
        socket.emit("error", { message: "Failed to join mess room" });
      }
    });

    // ─── Leave Mess Room ─────────────────────────
    socket.on("mess:leave", (messId: string) => {
      socket.leave(`mess:${messId}`);
      socket.to(`mess:${messId}`).emit("user:offline", {
        userId: user.id,
        name: user.name,
      });
    });

    // ─── Send Message ────────────────────────────
    socket.on("chat:send-message", async (data: {
      messId: string;
      content: string;
      type?: "TEXT" | "IMAGE" | "SYSTEM";
    }) => {
      try {
        if (!data.content?.trim()) {
          socket.emit("error", { message: "Message cannot be empty" });
          return;
        }

        if (data.content.length > 1000) {
          socket.emit("error", { message: "Message too long (max 1000 chars)" });
          return;
        }

        const hasAccess = await checkMessAccess(user.id, user.role, data.messId);
        if (!hasAccess) {
          socket.emit("error", { message: "No access to this mess" });
          return;
        }

        // Persist to DB
        const message = await prisma.message.create({
          data: {
            content: data.content.trim(),
            type: data.type || "TEXT",
            senderId: user.id,
            messId: data.messId,
          },
          select: {
            id: true,
            content: true,
            type: true,
            isEdited: true,
            createdAt: true,
            sender: {
              select: { id: true, name: true, role: true, image: true },
            },
          },
        });

        // Broadcast to everyone in the mess room
        io.to(`mess:${data.messId}`).emit("chat:new-message", message);
      } catch {
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    // ─── Typing Indicator ────────────────────────
    socket.on("chat:typing", (data: { messId: string; isTyping: boolean }) => {
      socket.to(`mess:${data.messId}`).emit("user:typing", {
        userId: user.id,
        name: user.name,
        isTyping: data.isTyping,
      });
    });

    // ─── Edit Message ────────────────────────────
    socket.on("chat:edit-message", async (data: {
      messageId: string;
      content: string;
      messId: string;
    }) => {
      try {
        const message = await prisma.message.findUnique({
          where: { id: data.messageId },
          select: { id: true, senderId: true, isDeleted: true },
        });

        if (!message) {
          socket.emit("error", { message: "Message not found" });
          return;
        }

        if (message.senderId !== user.id && user.role !== "ADMIN") {
          socket.emit("error", { message: "Cannot edit someone else's message" });
          return;
        }

        if (message.isDeleted) {
          socket.emit("error", { message: "Cannot edit a deleted message" });
          return;
        }

        const updated = await prisma.message.update({
          where: { id: data.messageId },
          data: { content: data.content.trim(), isEdited: true },
          select: {
            id: true,
            content: true,
            isEdited: true,
            updatedAt: true,
            sender: { select: { id: true, name: true } },
          },
        });

        io.to(`mess:${data.messId}`).emit("chat:message-edited", updated);
      } catch {
        socket.emit("error", { message: "Failed to edit message" });
      }
    });

    // ─── Delete Message ──────────────────────────
    socket.on("chat:delete-message", async (data: {
      messageId: string;
      messId: string;
    }) => {
      try {
        const message = await prisma.message.findUnique({
          where: { id: data.messageId },
          select: { id: true, senderId: true },
        });

        if (!message) {
          socket.emit("error", { message: "Message not found" });
          return;
        }

        const canDelete =
          message.senderId === user.id ||
          user.role === "ADMIN" ||
          user.role === "MESS_MANAGER";

        if (!canDelete) {
          socket.emit("error", { message: "Cannot delete this message" });
          return;
        }

        await prisma.message.update({
          where: { id: data.messageId },
          data: { isDeleted: true, content: "This message was deleted" },
        });

        io.to(`mess:${data.messId}`).emit("chat:message-deleted", {
          messageId: data.messageId,
        });
      } catch {
        socket.emit("error", { message: "Failed to delete message" });
      }
    });

    // ─── Mark Notifications Read ─────────────────
    socket.on("notification:mark-read", async (notificationId: string) => {
      try {
        await prisma.notification.updateMany({
          where: { id: notificationId, userId: user.id },
          data: { isRead: true, readAt: new Date() },
        });

        const unreadCount = await prisma.notification.count({
          where: { userId: user.id, isRead: false },
        });

        socket.emit("notification:unread-count", { unreadCount });
      } catch {
        socket.emit("error", { message: "Failed to mark notification as read" });
      }
    });

    // ─── Get Online Users ─────────────────────────
    socket.on("mess:get-online-users", async (messId: string) => {
      try {
        const room = io.sockets.adapter.rooms.get(`mess:${messId}`);
        const onlineSocketIds = room ? Array.from(room) : [];

        const onlineUsers: Array<{ id: string; name: string; role: string }> = [];

        for (const socketId of onlineSocketIds) {
          const s = io.sockets.sockets.get(socketId) as TAuthSocket;
          if (s?.user) {
            onlineUsers.push({
              id: s.user.id,
              name: s.user.name,
              role: s.user.role,
            });
          }
        }

        socket.emit("mess:online-users", { messId, onlineUsers });
      } catch {
        socket.emit("error", { message: "Failed to get online users" });
      }
    });

    // ─── Disconnect ──────────────────────────────
    socket.on("disconnect", () => {
      console.log(`❌ Socket disconnected: ${user.name}`);
    });
  });

  return io;
};

// ─── Helper: check mess access ────────────────────
const checkMessAccess = async (
  userId: string,
  role: string,
  messId: string
): Promise<boolean> => {
  if (role === "ADMIN") return true;

  if (role === "MESS_MANAGER") {
    const mess = await prisma.mess.findFirst({
      where: { id: messId, managerId: userId },
      select: { id: true },
    });
    return !!mess;
  }

  if (role === "MEAL_MANAGER") {
    const mm = await prisma.mealManager.findFirst({
      where: { messId, userId, isActive: true },
      select: { id: true },
    });
    return !!mm;
  }

  if (role === "MEMBER") {
    const member = await prisma.member.findFirst({
      where: { messId, userId, isActive: true },
      select: { id: true },
    });
    return !!member;
  }

  return false;
};

// ─── Exported emitter helpers ─────────────────────
export const getIO = (): SocketServer => {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
};

export const emitToUser = (userId: string, event: string, data: unknown) => {
  getIO().to(`user:${userId}`).emit(event, data);
};

export const emitToMess = (messId: string, event: string, data: unknown) => {
  getIO().to(`mess:${messId}`).emit(event, data);
};

export const emitToRole = (role: string, event: string, data: unknown) => {
  getIO().to(`role:${role}`).emit(event, data);
};

export const emitToAdmin = (event: string, data: unknown) => {
  getIO().to("admin").emit(event, data);
};

export const emitToGlobal = (event: string, data: unknown) => {
  getIO().to("global").emit(event, data);
};