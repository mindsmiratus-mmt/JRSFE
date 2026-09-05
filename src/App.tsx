import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { QueryProvider } from './components/providers/QueryProvider';
import { ProtectedRoute } from './components/ProtectedRoute';
import { DashboardLayout } from './components/layout/DashboardLayout';

// Pages
import { Login } from './pages/Login';
import { ForgotPassword } from './pages/ForgotPassword';
import { Dashboard } from './pages/Dashboard';
import { Category } from './pages/Category';
import { Customer } from './pages/Customer';
import { Invoice } from './pages/Invoice';
import { Item } from './pages/Item';
import { Shop } from './pages/Shop';
import { Stock } from './pages/Stock';
import { Tag } from './pages/Tag/Tag';
import { Vendor } from './pages/Vendor';
import { AdvanceOrder } from './pages/AdvanceOrder';
import { StockMovement } from './pages/StockMovement';
import { CurrentRate } from './pages/Currentrate';
import { User } from './pages/User';
import { ProfileForm } from './pages/Profile';
import { Role } from './pages/Role';
import { SaleItemAvailability } from './pages/SaleItemAvalibility';
import { Sale } from './pages/Sale';
import { SaleReport } from './pages/SaleReport';
import { GenerateTags } from './pages/Tag/GenerateTags';

// Reports
import { SaleItemwiseReport } from './pages/reports/SaleItemwiseReport';
import { SaleBillwiseReport } from './pages/reports/SaleBillwiseReport';
import { PurchaseReport } from './pages/reports/PurchaseReport';
import { ReceivedReport } from './pages/reports/ReceivedReport';
import { TransferReport } from './pages/reports/TransferReport';
import { AvailableStockReport } from './pages/reports/AvailableStockReport';
import { ReturnReport } from './pages/reports/ReturnReport';
import { MetalReport } from './pages/reports/MetalReport';

// Forms
import { InvoiceFormPage } from './components/forms/Invoice/InvoiceFormPage';
import { ItemFormPage } from './components/forms/Item/ItemFormPage';
import { ShopFormPage } from './components/forms/Shop/ShopFormPage';
import { TagFormPage } from './components/forms/Tag/TagFormPage';
import { AdvanceOrderFormPage } from './components/forms/Advance-Order/AdvanceOrderFormPage';
import { UserFormPage } from './components/forms/User/UserFormPage';
import { RoleFormPage } from './components/forms/Role/RoleFormPage';
import { StockEntryFormPage } from './components/forms/Stock-Entry/StockEntryFormPage';
import { StockMovementFormPage } from './components/forms/stock-movement/StockMovementFormPage';
import { CustomerFormPage } from './components/forms/customer/CustomerFormPage';
import { CurrentRateFormPage } from './components/forms/currunt-rate/CurrentRateFormPage';
import { SaleFormPage } from './components/forms/Sale/SaleFormPage';
import BatchForm from './components/forms/Stock-Entry/BatchForm';

// UI
import { ToastContainer } from './components/ui/toast';
import { ReturnList } from './pages/Return';
import { ReturnFormPage } from './components/forms/Return/ReturnFormPage';
import { ReturnItemAvailability } from './pages/ReturnItemAvailbility';
import WalletDetailsPage from './pages/WalletDetailsPage';
import { Porter } from './pages/Porter';
import { PorterFormPage } from './components/forms/porter/PorterFormPage';
import { StockTransfer } from './pages/StockTransfer';
import { StockTransferFormPage } from './components/forms/stock-transfer/StockTransferFormPage';
import { StockTransferApproval } from './pages/StockTransferAvailbility';
import { StockTransferReceivePage } from './pages/StockTransferReceive';
import CompleteAdvanceOrderPage from './components/forms/Sale/AdvacePaymentForm';
import  StockAvailable  from './pages/StockAvaliable';
import { ShopCurrentRatePage } from './pages/ShopCurrentRate';
import {ItemRepair} from './pages/ItemRepair';


const AppRoutes = () => {
  // const { isAuthenticated } = useAuth();

  return (
    <Routes>
      {/* <Route path="/login" element={isAuthenticated ? <Navigate to="/admin/dashboard" replace /> : <Login />} /> */}
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="user" element={<User />} />
        <Route path="profile" element={<ProfileForm />} />
        <Route path="user/new" element={<UserFormPage />} />
        <Route path="user/edit/:id" element={<UserFormPage />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="category" element={<Category />} />
        <Route path="currentrate" element={<CurrentRate />} />
        <Route path="currentrate/new" element={<CurrentRateFormPage />} />
        <Route path="currentrate/edit/:id" element={<CurrentRateFormPage />} />
        <Route path="customer" element={<Customer />} />
        <Route path="customer/new" element={<CustomerFormPage />} />
        <Route path="customer/edit/:id" element={<CustomerFormPage />} />
        <Route path="invoice" element={<Invoice />} />
        <Route path="invoice/new" element={<InvoiceFormPage />} />
        <Route path="invoice/edit/:id" element={<InvoiceFormPage />} />
        <Route path="item" element={<Item />} />
        <Route path="item/new" element={<ItemFormPage />} />
        <Route path="item/edit/:id" element={<ItemFormPage />} />
        <Route path="shop" element={<Shop />} />
        <Route path="shop/new" element={<ShopFormPage />} />
        <Route path="shop/rates" element={<ShopCurrentRatePage />} />
        <Route path="shop/edit/:id" element={<ShopFormPage />} />
        <Route path="stock" element={<Stock />} />
        <Route path="stock/new" element={<StockEntryFormPage />} />
        <Route path='batch/add' element={<BatchForm/>}/>
        <Route path="stock/edit/:id" element={<StockEntryFormPage />} />
        <Route path="stock-available" element={<StockAvailable />} />
        <Route path="tag" element={<Tag />} />
        <Route path="tag/new" element={<TagFormPage />} />
        <Route path="tag/edit/:id" element={<TagFormPage />} />
        <Route path="tag/generate" element={<GenerateTags />} />
        <Route path="vendor" element={<Vendor />} />
        <Route path="advance-order" element={<AdvanceOrder />} />
        <Route path="advance-order/new" element={<AdvanceOrderFormPage />} />
        <Route path="advance-order/edit/:id" element={<AdvanceOrderFormPage />} />
        <Route path="stock-movement" element={<StockMovement />} />
        <Route path="stock-movement/new" element={<StockMovementFormPage />} />
        <Route path="stock-movement/edit/:id" element={<StockMovementFormPage />} />
        <Route path="role" element={<Role />} />
        <Route path="role/new" element={<RoleFormPage />} />
        <Route path="role/edit/:id" element={<RoleFormPage />} />
        <Route path="return" element={<ReturnList/>}/>
        <Route path='return/new' element={<ReturnFormPage/>}/>
        <Route path='return-item' element={<ReturnItemAvailability/>}/>
        {/* SALE ROUTES */}
        <Route path="sale-item-availability" element={<SaleItemAvailability />} />
        <Route path="sale" element={<Sale />} />
        <Route path="sale-report" element={<SaleReport />} />

        {/* INDIVIDUAL REPORT ROUTES */}
        <Route path="reports/sale-itemwise" element={<SaleItemwiseReport />} />
        <Route path="reports/sale-billwise" element={<SaleBillwiseReport />} />
        <Route path="reports/purchase" element={<PurchaseReport />} />
        <Route path="reports/received" element={<ReceivedReport />} />
        <Route path="reports/transfer" element={<TransferReport />} />
        <Route path="reports/available-stock" element={<AvailableStockReport />} />
        <Route path="reports/return" element={<ReturnReport />} />
        <Route path="reports/metal" element={<MetalReport />} />

        <Route path="sale/new" element={<SaleFormPage />} />
        <Route path="sale/advance/:id" element={<CompleteAdvanceOrderPage />} />

        <Route path='ledger/:customerId' element={<WalletDetailsPage/>}></Route>
        {/* This route intercepts the Payment button clicks from the Sale table */}
        <Route path="sale/edit/:id" element={<SaleFormPage />} />
        <Route path="porter" element={<Porter />} />
        <Route path="porter/new" element={<PorterFormPage />} />
        <Route path="porter/edit/:id" element={<PorterFormPage />} />
        <Route path='stock-transfer' element={<StockTransfer />} />
        <Route path='stock-transfer/new' element={<StockTransferFormPage />} />
       <Route path='stock-transfer/edit/:id' element={<StockTransferFormPage />} />
       <Route path='stock-transfer/view/:id' element={<StockTransferFormPage />} />

       <Route path='stock-transfer-approve' element={<StockTransferApproval/>}/>

       <Route path='stock-transfer-receive' element={<StockTransferReceivePage/>}/>
       <Route path='item-repair' element={<ItemRepair/>}/>
      </Route>
      
      <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <BrowserRouter>
      <QueryProvider>
        <AuthProvider>
          <AppRoutes />
          <ToastContainer />
        </AuthProvider>
      </QueryProvider>
    </BrowserRouter>
  );
}

export default App;
