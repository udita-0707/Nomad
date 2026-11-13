import { Routes, Route, Navigate } from 'react-router-dom';
import { Landing } from './pages/Landing';
import { SignUp } from './pages/SignUp';
import { SignIn } from './pages/SignIn';
import { Dashboard } from './pages/Dashboard';
import { ProfileSetup } from './pages/ProfileSetup';
import { CreateGroup } from './pages/CreateGroup';
import { SearchPage } from './pages/Search';
import { MatchesPage } from './pages/Matches';
import { GroupPlanPage } from './pages/GroupPlan';
import { GroupMembersPage } from './pages/GroupMembers';
import { TravellerProfilePage } from './pages/TravellerProfile';
import { ProtectedRoute } from './components/ProtectedRoute';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/signin" element={<SignIn />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute requireProfile>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfileSetup />
          </ProtectedRoute>
        }
      />
      <Route
        path="/groups/new"
        element={
          <ProtectedRoute requireProfile>
            <CreateGroup />
          </ProtectedRoute>
        }
      />
      <Route
        path="/search"
        element={
          <ProtectedRoute>
            <SearchPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/search/:id"
        element={
          <ProtectedRoute>
            <MatchesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/groups/:id/plan"
        element={
          <ProtectedRoute requireProfile>
            <GroupPlanPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/groups/:id/members"
        element={
          <ProtectedRoute requireProfile>
            <GroupMembersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/travellers/:id"
        element={
          <ProtectedRoute requireProfile>
            <TravellerProfilePage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
