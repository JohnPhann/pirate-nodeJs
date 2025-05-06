import React, { useState } from 'react';
import { Popover } from 'antd';
import { SmileOutlined } from '@ant-design/icons';

const REACTIONS = [
  // Positive
  '👍', '👎', '❤️', '🔥', '💯', '🎉', '🥳', '👏', '🙌', '🤩', '😎', '😊', '😇', '✨',

  // Funny & playful
  '😂', '🤣', '😹', '😜', '🤪', '😛', '💩', '🫠',

  // Emotional
  '😢', '😭', '😡', '🤬', '😮', '😱', '😳', '😰', '😔', '😞', '🤯',

  // Neutral / thoughtful
  '🤔', '😐', '😶', '😴', '😌', '😕',

  // Hand gestures & actions
  '🤝', '🙏', '✌️', '👌', '👀', '🫶', '🫵', '✋', '👋',

  // Cool / special effects
  '🌟', '⚡️', '💥', '🌈', '🌊', '🎶', '🎈', '🎁' 
];

interface ReactionPickerProps {
  onSelect: (reaction: string) => void;
}

const ReactionPicker: React.FC<ReactionPickerProps> = ({ onSelect }) => {
  const [open, setOpen] = useState(false);

  const content = (
    <div className="flex flex-wrap gap-2 p-2 bg-white rounded-lg shadow-lg">
      {REACTIONS.map((reaction) => (
        <button
          key={reaction}
          className="text-2xl hover:scale-110 transition-transform duration-200"
          onClick={() => {
            onSelect(reaction);
            setOpen(false);
          }}
        >
          {reaction}
        </button>
      ))}
    </div>
  );

  return (
    <Popover
      content={content}
      trigger="click"
      open={open}
      onOpenChange={setOpen}
      placement="top"
    >
      <button
        className="p-1 hover:bg-gray-100 rounded-full transition-colors duration-200"
        onClick={() => setOpen(!open)}
      >
        <SmileOutlined className="text-gray-500" />
      </button>
    </Popover>
  );
};

export default ReactionPicker; 