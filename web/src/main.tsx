import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { DEMO, loadDemo } from './demo';
import { AuthProvider, useAuth } from './auth';
import { Layout } from './components/Layout';
import { Loading, ToastProvider } from './components/ui';
import { LookupsProvider } from './lookups';
import { AdmissionDetail } from './pages/AdmissionDetail';
import { AdmissionsList, NewAdmission } from './pages/Admissions';
import { Settings, Users } from './pages/Admin';
import { ApprovalDetail, ApprovalInbox, RefundDetail, RefundsList } from './pages/Approvals';
import { ConsultantProfile, ConsultantsList, ConsultantStatement } from './pages/Consultants';
import { Dashboard } from './pages/Dashboard';
import { DayClosing } from './pages/DayClosing';
import { ChangePassword, Login } from './pages/Login';
import { FeeStructure, Masters } from './pages/Masters';
import { PaymentDetail, PaymentRegister, Receipt, Statement } from './pages/Payments';
import { ReceivePayment } from './pages/ReceivePayment';
import { AdmissionHistoryReport, AuditReport, CollectionReport, ConsultantReports, ControlReports, DueReport, FeeSummaryReport } from './pages/Reports';
import { StudentProfile, StudentsList } from './pages/Students';
import './styles.css';

function App() {
  const { me, loading } = useAuth();
  if (loading) return <Loading />;
  if (!me) return <Login />;
  if (me.mustChangePassword) return <ChangePassword forced />;
  return (
    <LookupsProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="receive-payment" element={<ReceivePayment />} />
          <Route path="students" element={<StudentsList />} />
          <Route path="students/:id" element={<StudentProfile />} />
          <Route path="admissions" element={<AdmissionsList />} />
          <Route path="admissions/new" element={<NewAdmission />} />
          <Route path="admissions/:id" element={<AdmissionDetail />} />
          <Route path="admissions/:id/statement" element={<Statement />} />
          <Route path="payments" element={<PaymentRegister />} />
          <Route path="payments/:id" element={<PaymentDetail />} />
          <Route path="payments/:id/receipt" element={<Receipt />} />
          <Route path="refunds" element={<RefundsList />} />
          <Route path="refunds/:id" element={<RefundDetail />} />
          <Route path="approvals" element={<ApprovalInbox />} />
          <Route path="approvals/:id" element={<ApprovalDetail />} />
          <Route path="consultants" element={<ConsultantsList />} />
          <Route path="consultants/:id" element={<ConsultantProfile />} />
          <Route path="consultants/:id/statement" element={<ConsultantStatement />} />
          <Route path="day-closing" element={<DayClosing />} />
          <Route path="reports/collection" element={<CollectionReport />} />
          <Route path="reports/due" element={<DueReport />} />
          <Route path="reports/fee-summary" element={<FeeSummaryReport />} />
          <Route path="reports/control" element={<ControlReports />} />
          <Route path="reports/admission-history" element={<AdmissionHistoryReport />} />
          <Route path="reports/consultants" element={<ConsultantReports />} />
          <Route path="reports/audit" element={<AuditReport />} />
          <Route path="masters" element={<Masters />} />
          <Route path="masters/fee-structure" element={<FeeStructure />} />
          <Route path="admin/users" element={<Users />} />
          <Route path="admin/settings" element={<Settings />} />
          <Route path="change-password" element={<ChangePassword />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </LookupsProvider>
  );
}

/* GitHub Pages cannot serve deep links, so the demo uses #/ URLs */
const Router = DEMO ? HashRouter : BrowserRouter;

async function start() {
  if (DEMO) await loadDemo();
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <Router>
        <ToastProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </ToastProvider>
      </Router>
    </StrictMode>,
  );
}
start();
