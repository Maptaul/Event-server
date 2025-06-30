# LearnBridge Server

A comprehensive backend API for the LearnBridge learning platform built with Node.js, Express, and MongoDB.

**Live Server**: [https://learn-bridge-server-two.vercel.app/](https://learn-bridge-server-two.vercel.app/)

## 📖 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Installation](#installation)
- [API Endpoints](#api-endpoints)
- [Environment Variables](#environment-variables)
- [Database Schema](#database-schema)
- [Deployment](#deployment)
- [Contributing](#contributing)

## 🌟 Features

### 🔐 Authentication System
- **Custom Authentication**: Built without third-party auth providers
- **Secure Registration/Login**: Password hashing with bcryptjs
- **JWT Token Management**: Secure session handling
- **User Profile Management**: Complete profile with photo URL support
- **Password Management**: Change password functionality

### 📅 Event Management
- **CRUD Operations**: Create, read, update, delete events
- **Event Participation**: Join/leave events with attendee tracking
- **Event Filtering**: Filter events by creator ("My Events")
- **Search Functionality**: Find events easily
- **Real-time Updates**: Live attendee count updates

### 👥 User Management
- **Role-based Access**: Admin, Tutor, Student roles
- **User Registration**: With comprehensive validation
- **Profile Photos**: Support for photo URL with validation
- **User Search**: Find users by name or email
- **Account Management**: Active/inactive status control

### 🎓 Study Sessions & Materials
- **Session Management**: Create and manage study sessions
- **Material Sharing**: Upload and share learning materials
- **Approval Workflow**: Admin approval system for sessions
- **Tutor Dashboard**: Manage sessions and materials
- **Student Notes**: Personal note-taking system

### 💳 Payment Integration
- **Stripe Integration**: Secure payment processing
- **Payment History**: Track all transactions
- **Session Fees**: Flexible pricing for study sessions

## 🛠 Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB
- **Authentication**: JWT + bcryptjs
- **Payment**: Stripe API
- **Deployment**: Vercel
- **CORS**: Configured for multiple origins

## � Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/YourUsername/LearnBridge-server.git
   cd LearnBridge-server
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables** (see [Environment Variables](#environment-variables))

4. **Start the development server**:
   ```bash
   npm start
   ```

The server will run on `http://localhost:5000`

## 🔧 Environment Variables

Create a `.env` file in the root directory:

```env
# Database
DB_USER=your_mongodb_username
DB_PASS=your_mongodb_password

# Authentication
ACCESS_TOKEN_SECRET=your_jwt_secret_key

# Payment
STRIPE_SECRET_KEY=your_stripe_secret_key

# Server
PORT=5000
```

## 📡 API Endpoints

### Authentication
- `POST /auth/register` - User registration with validation
- `POST /auth/login` - User login with JWT token
- `PUT /auth/change-password` - Change user password
- `GET /auth/profile` - Get current user profile
- `POST /auth/logout` - User logout

### Events
- `GET /events` - Get all events
- `POST /events` - Create new event
- `PUT /events/:id` - Update event (creator only)
- `DELETE /events/:id` - Delete event (creator only)
- `PATCH /events/:id/join` - Join an event
- `GET /events/creator/:email` - Get user's created events
- `GET /events/joined/:userId` - Get events user has joined

### Users
- `GET /users` - Search users by name/email
- `GET /users/email` - Get user by email
- `PUT /users/update-role/:id` - Update user role (admin only)

### Study Sessions
- `GET /studysessions` - Get all study sessions
- `POST /studysessions` - Create study session
- `GET /studysessions/tutor/:email` - Get sessions by tutor
- `PUT /studysessions/approve/:id` - Approve session (admin)
- `PUT /studysessions/reject/:id` - Reject session (admin)
- `PUT /studysessions/update/:id` - Update approved session
- `DELETE /studysessions/:id` - Delete session

### Materials & Notes
- `GET /materials` - Get all materials
- `POST /materials` - Upload new material
- `PUT /materials/:id` - Update material
- `DELETE /materials/:id` - Delete material
- `POST /createNote` - Create personal note
- `GET /notes/:email` - Get user's notes
- `PUT /notes/update/:id` - Update note
- `DELETE /notes/delete/:id` - Delete note

### Testing
- `GET /test` - Server status and available endpoints

## 🗄 Database Schema

### Users Collection
```javascript
{
  name: String,
  email: String (unique),
  password: String (hashed),
  photoURL: String (optional),
  role: String (default: "student"),
  createdAt: Date,
  lastLogin: Date,
  isActive: Boolean
}
```

### Events Collection
```javascript
{
  title: String,
  description: String,
  date: Date,
  location: String,
  creatorEmail: String,
  attendees: [String],
  attendeeCount: Number,
  createdAt: Date,
  updatedAt: Date
}
```

### Study Sessions Collection
```javascript
{
  title: String,
  description: String,
  tutorEmail: String,
  status: String, // "pending", "approved", "rejected"
  isFree: Boolean,
  amount: Number,
  createdAt: Date
}
```

## 🌐 CORS Configuration

The server accepts requests from:
- `https://learnbridge-26280.web.app` (Production)
- `http://localhost:5173` (Development)
- `http://localhost:5174` (Alternative Development)

## 🚀 Deployment

### Vercel Deployment
This application is optimized for Vercel deployment:

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Deploy:
   ```bash
   vercel --prod
   ```

The `vercel.json` configuration is already included.

### Environment Setup
Make sure to add all environment variables in your Vercel dashboard.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Make your changes and test thoroughly
4. Commit your changes: `git commit -m 'Add new feature'`
5. Push to the branch: `git push origin feature/new-feature`
6. Submit a pull request

## 📞 Support

- Create an issue for bug reports
- Contact: [Your Email]
- Documentation: Visit `/test` endpoint when server is running

## 📄 License

This project is licensed under the ISC License.


