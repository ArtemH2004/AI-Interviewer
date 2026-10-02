import { cx } from './ui';

type Props = {
  recording: boolean;
  disabled?: boolean;
  level: number;
  onClick: () => void;
};

// Большая кнопка записи: стеклянное кольцо, красный круг превращается в квадрат «стоп»
export function RecordButton({ recording, disabled, level, onClick }: Props) {
  return (
    <div className="relative grid size-32 place-items-center">
      {recording && (
        <>
          <span className="absolute inset-4 animate-pulse-ring rounded-full bg-ios-red/30" />
          <span
            className="absolute inset-4 rounded-full bg-ios-red/20 transition-transform duration-100"
            style={{ transform: `scale(${1 + level * 0.45})` }}
          />
        </>
      )}
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={recording ? 'Остановить запись' : 'Начать запись'}
        className="glass pressable grid size-24 place-items-center rounded-full"
      >
        <span
          className={cx(
            'bg-ios-red shadow-[inset_0_1px_0_rgb(255_255_255/0.5),0_6px_16px_-4px_color-mix(in_srgb,var(--color-ios-red)_70%,transparent)] transition-all duration-500 ease-spring',
            recording ? 'size-8 rounded-lg' : 'size-16 rounded-full',
          )}
        />
      </button>
    </div>
  );
}
