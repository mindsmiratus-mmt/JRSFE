# JRS Frontend

React application for Jewellery Retail Shop management system built with Vite, TypeScript, and Tailwind CSS.

## Features

- ✅ React 19 with TypeScript
- ✅ Vite for fast development and building
- ✅ Tailwind CSS for styling
- ✅ React Router for navigation
- ✅ Authentication with protected routes
- ✅ Login and Forgot Password pages
- ✅ Dashboard layout with top and side navigation
- ✅ All required pages: Category, Currentrate, Customer, Invoice, Item, Shop, Stock, Tag, Vendor, AdvanceOrder, StockMovement

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

```bash
npm install
```

### Development

Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Build

Build for production:

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
src/
├── components/
│   ├── layout/
│   │   ├── DashboardLayout.tsx
│   │   ├── SideNavbar.tsx
│   │   └── TopNavbar.tsx
│   └── ProtectedRoute.tsx
├── contexts/
│   └── AuthContext.tsx
├── pages/
│   ├── Login.tsx
│   ├── ForgotPassword.tsx
│   ├── Dashboard.tsx
│   ├── Category.tsx
│   ├── Currentrate.tsx
│   ├── Customer.tsx
│   ├── Invoice.tsx
│   ├── Item.tsx
│   ├── Shop.tsx
│   ├── Stock.tsx
│   ├── Tag.tsx
│   ├── Vendor.tsx
│   ├── AdvanceOrder.tsx
│   └── StockMovement.tsx
├── App.tsx
├── main.tsx
└── index.css
```

## Authentication

The application uses a mock authentication system. To integrate with your backend API:

1. Update the `login` function in `src/contexts/AuthContext.tsx`
2. Replace the mock API calls with actual API endpoints
3. Update token storage and validation logic

## Routes

- `/login` - Login page
- `/forgot-password` - Password reset page
- `/` - Dashboard (protected)
- `/category` - Category management (protected)
- `/currentrate` - Current rate management (protected)
- `/customer` - Customer management (protected)
- `/invoice` - Invoice management (protected)
- `/item` - Item management (protected)
- `/shop` - Shop management (protected)
- `/stock` - Stock management (protected)
- `/tag` - Tag management (protected)
- `/vendor` - Vendor management (protected)
- `/advance-order` - Advance order management (protected)
- `/stock-movement` - Stock movement management (protected)

## Technologies

- **React 19** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **React Router** - Client-side routing
