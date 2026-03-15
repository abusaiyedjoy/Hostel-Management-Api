# 🏨 Hostel Management API Documentation

## Base URL

```
http://localhost:5000/api
```

## Authentication

All protected routes require Bearer token in header:

```
Authorization: Bearer <your_jwt_token>
```

---

## 🔐 AUTH ENDPOINTS

### Register

```
POST /auth/register
```

Body:

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "john123",
  "phone": "+1-1234567890"
}
```

### Login

```
POST /auth/login
```

Body:

```json
{
  "email": "john@example.com",
  "password": "john123"
}
```

Response:

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { "id": "...", "name": "...", "role": "MEMBER" },
    "accessToken": "eyJ..."
  }
}
```

### Get My Profile

```
GET /auth/me
Headers: Authorization: Bearer <token>
```

### Update Profile

```
PATCH /auth/update-profile
Headers: Authorization: Bearer <token>
```

Body:

```json
{
  "name": "New Name",
  "phone": "+1-9999999999"
}
```

### Change Password

```
PATCH /auth/change-password
Headers: Authorization: Bearer <token>
```

Body:

```json
{
  "oldPassword": "john123",
  "newPassword": "newpass123"
}
```

---

## 👑 ADMIN ENDPOINTS

### Get Dashboard Stats

```
GET /admin/users/stats
Headers: Authorization: Bearer <admin_token>
```

### Get All Users

```
GET /admin/users?page=1&limit=10&role=MEMBER&isActive=true&search=john
Headers: Authorization: Bearer <admin_token>
```

### Get User By ID

```
GET /admin/users/:id
Headers: Authorization: Bearer <admin_token>
```

### Update User Role

```
PATCH /admin/users/:id/role
Headers: Authorization: Bearer <admin_token>
```

Body:

```json
{ "role": "MESS_MANAGER" }
```

Available roles: `ADMIN`, `MESS_MANAGER`, `MEAL_MANAGER`, `MEMBER`

### Activate / Deactivate User

```
PATCH /admin/users/:id/status
Headers: Authorization: Bearer <admin_token>
```

Body:

```json
{ "isActive": false }
```

### Delete User

```
DELETE /admin/users/:id
Headers: Authorization: Bearer <admin_token>
```

---

## 🏠 MESS ENDPOINTS

### Create Mess (Admin only)

```
POST /mess
Headers: Authorization: Bearer <admin_token>
```

Body:

```json
{
  "name": "Delhi Boys Hostel",
  "email": "delhi@hostel.com",
  "phone": "+91-9000000001",
  "address": "123 Main Street",
  "city": "New Delhi",
  "state": "Delhi",
  "capacity": 50,
  "ratePerMeal": 50,
  "managerId": "clx..."
}
```

### Get All Mess

```
GET /mess?page=1&limit=10&search=delhi&city=New Delhi&isActive=true
Headers: Authorization: Bearer <token>
```

### Get My Mess (Mess Manager)

```
GET /mess/my-mess
Headers: Authorization: Bearer <mess_manager_token>
```

### Get Mess By ID

```
GET /mess/:id
Headers: Authorization: Bearer <token>
```

### Get Mess Stats

```
GET /mess/:id/stats
Headers: Authorization: Bearer <admin_or_mess_manager_token>
```

### Update Mess

```
PATCH /mess/:id
Headers: Authorization: Bearer <admin_or_mess_manager_token>
```

Body:

```json
{
  "name": "Updated Name",
  "ratePerMeal": 60,
  "capacity": 100
}
```

### Delete Mess (Admin only)

```
DELETE /mess/:id
Headers: Authorization: Bearer <admin_token>
```

---

## 👥 MEMBER ENDPOINTS

### Add Member

```
POST /mess/:messId/members
Headers: Authorization: Bearer <admin_or_mess_manager_token>
```

Body:

```json
{
  "userId": "clx...",
  "registrationNo": "DBH-2024-001",
  "dateOfJoining": "2024-01-15",
  "totalBalance": 500
}
```

### Get All Members

```
GET /mess/:messId/members?page=1&limit=10&search=john&isActive=true
Headers: Authorization: Bearer <token>
```

### Get My Member Profile

```
GET /members/my-profile
Headers: Authorization: Bearer <member_token>
```

### Get Member By ID

```
GET /mess/:messId/members/:id
Headers: Authorization: Bearer <token>
```

### Get Member Meal Summary

```
GET /members/:id/meal-summary
Headers: Authorization: Bearer <token>
```

### Update Member

```
PATCH /mess/:messId/members/:id
Headers: Authorization: Bearer <admin_or_mess_manager_token>
```

Body:

```json
{
  "totalBalance": 1000,
  "isActive": true
}
```

### Remove Member

```
DELETE /mess/:messId/members/:id
Headers: Authorization: Bearer <admin_or_mess_manager_token>
```

---

## 🍽️ MEAL MANAGER ENDPOINTS

### Assign Meal Manager

```
POST /mess/:messId/meal-managers
Headers: Authorization: Bearer <admin_or_mess_manager_token>
```

Body:

```json
{ "userId": "clx..." }
```

### Get All Meal Managers

```
GET /mess/:messId/meal-managers?page=1&limit=10&isActive=true
Headers: Authorization: Bearer <admin_or_mess_manager_token>
```

### Get My Meal Manager Profile

```
GET /meal-managers/my-profile
Headers: Authorization: Bearer <meal_manager_token>
```

### Get Meal Manager Stats

```
GET /meal-managers/:id/stats
Headers: Authorization: Bearer <token>
```

### Update Meal Manager Status

```
PATCH /mess/:messId/meal-managers/:id/status
Headers: Authorization: Bearer <admin_or_mess_manager_token>
```

Body:

```json
{ "isActive": true }
```

### Remove Meal Manager

```
DELETE /mess/:messId/meal-managers/:id
Headers: Authorization: Bearer <admin_or_mess_manager_token>
```

---

## 🍛 MEAL ENDPOINTS

### Create Meal

```
POST /mess/:messId/meals
Headers: Authorization: Bearer <admin_mess_or_meal_manager_token>
```

Body:

```json
{
  "mealType": "LUNCH",
  "date": "2024-03-15",
  "costPerMeal": 60,
  "note": "Special biryani today"
}
```

Meal types: `BREAKFAST`, `LUNCH`, `DINNER`, `SNACKS`

### Get All Meals

```
GET /mess/:messId/meals?page=1&limit=10&mealType=LUNCH&startDate=2024-01-01&endDate=2024-12-31
Headers: Authorization: Bearer <token>
```

### Get Monthly Summary

```
GET /mess/:messId/meals/summary
Headers: Authorization: Bearer <token>
```

### Get Meal By ID

```
GET /mess/:messId/meals/:id
Headers: Authorization: Bearer <token>
```

### Update Meal

```
PATCH /mess/:messId/meals/:id
Headers: Authorization: Bearer <admin_mess_or_meal_manager_token>
```

Body:

```json
{
  "costPerMeal": 70,
  "note": "Price updated"
}
```

### Delete Meal

```
DELETE /mess/:messId/meals/:id
Headers: Authorization: Bearer <admin_mess_or_meal_manager_token>
```

### Create Single Meal Entry

```
POST /mess/:messId/meals/:id/entries
Headers: Authorization: Bearer <admin_mess_or_meal_manager_token>
```

Body:

```json
{
  "memberId": "clx...",
  "status": "TAKEN",
  "note": "Late entry"
}
```

Status options: `TAKEN`, `NOT_TAKEN`, `CANCELLED`

### Bulk Create Meal Entries

```
POST /mess/:messId/meals/:id/entries/bulk
Headers: Authorization: Bearer <admin_mess_or_meal_manager_token>
```

Body:

```json
{
  "memberIds": ["clx...", "clx...", "clx..."],
  "status": "TAKEN"
}
```

### Get All Meal Entries

```
GET /mess/:messId/meals/:id/entries
Headers: Authorization: Bearer <token>
```

### Update Meal Entry

```
PATCH /mess/:messId/meals/:mealId/entries/:id
Headers: Authorization: Bearer <admin_mess_or_meal_manager_token>
```

Body:

```json
{
  "status": "CANCELLED",
  "note": "Member was absent"
}
```

### Delete Meal Entry

```
DELETE /mess/:messId/meals/:mealId/entries/:id
Headers: Authorization: Bearer <admin_mess_or_meal_manager_token>
```
