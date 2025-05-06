import { message } from 'antd';

interface MessageConfig {
  content: string;
  duration?: number;
  key?: string;
}

export const showSuccess = (config: MessageConfig) => {
  message.success({
    content: config.content,
    duration: config.duration || 2,
    key: config.key,
  });
};

export const showError = (config: MessageConfig) => {
  message.error({
    content: config.content,
    duration: config.duration || 3,
    key: config.key,
  });
};

export const showWarning = (config: MessageConfig) => {
  message.warning({
    content: config.content,
    duration: config.duration || 3,
    key: config.key,
  });
};

export const showInfo = (config: MessageConfig) => {
  message.info({
    content: config.content,
    duration: config.duration || 3,
    key: config.key,
  });
}; 