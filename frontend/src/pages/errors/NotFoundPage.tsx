import { useNavigate } from 'react-router-dom';

export const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-base-200 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-9xl font-bold text-primary opacity-20">404</h1>
        <h2 className="text-3xl font-bold text-base-content mb-4">
          Page Not Found
        </h2>
        <p className="text-base-content/60 mb-8">
          The page you are looking for does not exist or has been moved.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            className="btn btn-outline"
            onClick={() => navigate(-1)}
          >
            Go Back
          </button>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/')}
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};
