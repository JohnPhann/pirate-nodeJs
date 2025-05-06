import { message } from 'antd';

interface ErrorResponse {
  response?: {
    data?: {
      error?: string;
      message?: string;
    };
  };
  message?: string;
}

export const handleError = (error: ErrorResponse, action: string) => {
  console.error(`Error during ${action}:`, error);

  // Get error message from response or error object
  const errorMessage = error.response?.data?.error || 
                      error.response?.data?.message || 
                      error.message || 
                      'An unexpected error occurred';

  // Show error message
  message.error({
    content: errorMessage,
    duration: 3,
    style: {
      marginTop: '50vh',
    },
  });
}; 