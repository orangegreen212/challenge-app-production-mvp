'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/shared/logo';
import { UploadDropzone } from '@/components/shared/upload-dropzone';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ProtectedRoute } from '@/components/shared/protected-route';
import { ArrowRight, FileText } from 'lucide-react';

export default function CreatePage() {
  const router = useRouter();
  const [pastedText, setPastedText] = useState('');
  const [hasFile, setHasFile] = useState(false);

  const canContinue = hasFile || pastedText.trim().length > 0;

  return (
    <ProtectedRoute>
    <div className="min-h-screen bg-gradient-to-b from-background to-accent/20">
      <div className="mx-auto max-w-2xl px-6 py-8 sm:py-12">
        <div className="mb-8">
          <Logo size="md" />
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl text-balance">
            What do you want to accomplish?
          </h1>
          <p className="mt-3 text-lg text-muted-foreground text-balance">
            Upload your material and we&apos;ll turn it into a practical daily plan.
          </p>
        </div>

        <div className="space-y-6">
          <UploadDropzone onFileSelect={() => setHasFile(true)} />

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-sm text-muted-foreground">or paste your text</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <div>
            <Textarea
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder="Paste any text, notes, course outline, or goal description here..."
              className="min-h-[140px] text-base resize-none rounded-xl"
            />
          </div>

          <Button
            onClick={() => {
              sessionStorage.setItem('challenge-create-background', pastedText);
              router.push('/create/configure');
            }}
            disabled={!canContinue}
            size="lg"
            className="w-full text-base font-semibold rounded-xl shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/30 disabled:opacity-50"
          >
            Continue
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>

          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <FileText className="h-4 w-4" />
            <button
              onClick={() => {
                sessionStorage.setItem('challenge-create-background', pastedText);
                router.push('/create/configure');
              }}
              className="text-primary hover:underline font-medium"
            >
              You can also create a challenge without uploading a document.
            </button>
          </div>
        </div>
      </div>
    </div>
    </ProtectedRoute>
  );
}
