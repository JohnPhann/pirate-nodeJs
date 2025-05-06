import React from 'react';
import { Alert, Button } from 'antd';
import { CloseOutlined } from '@ant-design/icons';

interface ErrorAlertProps {
  message: string;
  description?: string;
  onClose?: () => void;
  showCloseButton?: boolean;
}

const ErrorAlert: React.FC<ErrorAlertProps> = ({
  message,
  description,
  onClose,
  showCloseButton = true
}) => {
  return (
    <div className="fixed top-4 right-4 z-50 max-w-md">
      <Alert
        message={message}
        description={description}
        type="error"
        showIcon
        action={
          showCloseButton && onClose && (
            <Button
              type="text"
              icon={<CloseOutlined />}
              onClick={onClose}
              className="text-red-500 hover:text-red-600"
            />
          )
        }
        className="shadow-lg rounded-lg border-red-200 bg-red-50"
        banner
      />
    </div>
  );
};

export default ErrorAlert; 