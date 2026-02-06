# 💰 Money Manager – Backend API

A robust backend service for the **Money Manager Web Application**, built using **Node.js, Express, and MongoDB**.  
This API powers account management, income & expense tracking, dashboards, and secure user authentication.

---

## 🚀 Features

### 🔐 Authentication
- JWT-based authentication
- Protected routes using middleware
- User-specific data isolation

### 🏦 Account Management
- Create multiple accounts (Bank, Cash, Savings, Wallet, etc.)
- Soft delete accounts (preserves transaction history)
- Track balances per account
- Dashboard summary (Total Net Worth)

### 💸 Transactions (Income & Expense)
- Add income and expense records
- Categorization (Food, Fuel, Medical, Loan, etc.)
- Division support (Personal / Office)
- Date & time tracking
- Edit transactions within **12-hour window**
- Filter by:
  - Date range
  - Category
  - Division
  - Account

### 🔄 Transfers
- Transfer money between accounts
- Atomic balance updates
- Transfer history support

### 📊 Dashboard & Reports
- Monthly / Weekly / Yearly income & expenditure
- Category-wise summaries
- Account-level analytics

---

## 🧰 Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB (Atlas)
- **ODM:** Mongoose
- **Authentication:** JWT
- **Security:** bcrypt, auth middleware
- **Architecture:** REST API

---