import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";

type Props = {
  orderId: string;
  kind: "before" | "after";
  paths: string[];
  disabled?: boolean;
  onUploaded: (paths: string[]) => Promise<void> | void;
};

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const BUCKET = "order-photos";

function uploadWithProgress(
  path: string,
  file: File,
  token: string,
  onProgress: (percent: number) => void,
) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("x-upsert", "true");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`Ошибка загрузки (${xhr.status})`));
    xhr.onerror = () => reject(new Error("Сеть недоступна"));
    xhr.send(file);
  });
}

export function PhotoUploader({ orderId, kind, paths, disabled, onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [urls, setUrls] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    if (paths.length === 0) {
      setUrls([]);
      return;
    }
    supabase.storage
      .from(BUCKET)
      .createSignedUrls(paths, 3600)
      .then(({ data }) => {
        if (!cancelled) setUrls((data ?? []).map((d) => d.signedUrl).filter(Boolean) as string[]);
      });
    return () => {
      cancelled = true;
    };
  }, [paths]);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      toast.error("Сессия истекла, войдите заново");
      return;
    }
    const list = Array.from(files);
    const uploaded: string[] = [];
    setProgress(0);
    try {
      for (let i = 0; i < list.length; i++) {
        const file = list[i];
        const ext = file.name.split(".").pop() ?? "jpg";
        const path = `${orderId}/${kind}/${crypto.randomUUID()}.${ext}`;
        await uploadWithProgress(path, file, token, (p) => {
          setProgress(Math.round(((i + p / 100) / list.length) * 100));
        });
        uploaded.push(path);
      }
      setProgress(100);
      await onUploaded([...paths, ...uploaded]);
      toast.success(kind === "before" ? "Фото «до» загружены" : "Фото «после» загружены");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Не удалось загрузить фото");
    } finally {
      setProgress(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">
          Фото {kind === "before" ? "до" : "после"} уборки
        </p>
        <span className="text-xs text-muted-foreground">{paths.length} шт.</span>
      </div>

      {urls.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {urls.map((url) => (
            <img
              key={url}
              src={url}
              alt={`Фото ${kind === "before" ? "до" : "после"} уборки`}
              loading="lazy"
              className="size-20 shrink-0 rounded-lg border border-border object-cover"
            />
          ))}
        </div>
      )}

      {progress !== null && (
        <div className="space-y-1">
          <Progress value={progress} />
          <p className="text-xs text-muted-foreground">Загрузка… {progress}%</p>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || progress !== null}
        onClick={() => inputRef.current?.click()}
      >
        {progress !== null ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <ImagePlus className="size-4" />
        )}
        Добавить фото
      </Button>
    </div>
  );
}
