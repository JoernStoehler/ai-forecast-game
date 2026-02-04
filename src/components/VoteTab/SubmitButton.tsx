interface SubmitButtonProps {
  disabled: boolean;
  isLoading: boolean;
  onClick: () => void;
}

export function SubmitButton({ disabled, isLoading, onClick }: SubmitButtonProps) {
  return (
    <div className="submit-button-container">
      <button
        className="submit-button"
        disabled={disabled || isLoading}
        onClick={onClick}
      >
        {isLoading ? 'Submitting...' : 'Submit'}
      </button>
      {disabled && !isLoading && (
        <p className="submit-hint">Select an option for each topic to continue</p>
      )}
    </div>
  );
}

export default SubmitButton;
