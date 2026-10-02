import { useState } from 'react';
import Markdown from 'react-markdown';
import { Check, Copy, RotateCw, Sparkles } from 'lucide-react';
import { Button, SectionHeader } from './ui';

type Props = {
  answer: string;
  loading: boolean;
  onRegenerate: () => void;
};

const SKELETON_WIDTHS = [92, 100, 78, 60];

export function AnswerCard({ answer, loading, onRegenerate }: Props) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(answer);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <section className="card">
      <SectionHeader
        title="Ответ"
        icon={<Sparkles className="size-3.5 text-ios-blue" />}
        actions={
          answer &&
          !loading && (
            <>
              <Button size="sm" iconOnly onClick={onRegenerate} title="Сгенерировать заново" aria-label="Сгенерировать заново">
                <RotateCw className="size-4" />
              </Button>
              <Button size="sm" iconOnly onClick={copy} title="Копировать" aria-label="Копировать">
                {copied ? <Check className="size-4 text-ios-green" /> : <Copy className="size-4" />}
              </Button>
            </>
          )
        }
      />
      {loading ? (
        <div className="flex flex-col gap-2 py-1" aria-label="Генерация ответа">
          {SKELETON_WIDTHS.map((w) => (
            <div key={w} className="h-3 animate-pulse rounded-full bg-field" style={{ width: `${w}%` }} />
          ))}
        </div>
      ) : (
        <div className="markdown select-text">
          <Markdown>{answer}</Markdown>
        </div>
      )}
    </section>
  );
}
