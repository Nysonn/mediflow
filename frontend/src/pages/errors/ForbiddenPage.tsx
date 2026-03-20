import { useNavigate } from 'react-router-dom';

export const ForbiddenPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-base-200 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-9xl font-bold text-error opacity-20">403</h1>
        <h2 className="text-3xl font-bold text-base-content mb-4">
          Access Denied
        </h2>
        <p className="text-base-content/60 mb-8">
          You do not have permission to access this page.
        </p>
        <button
          className="btn btn-primary"
          onClick={() => navigate('/')}
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
};
