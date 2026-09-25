import { createFileRoute, redirect } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type ChangeEvent } from "react";
import {
  CalendarDays,
  Camera,
  CheckCircle2,
  FileDown,
  ImagePlus,
  Loader2,
  MapPin,
  Save,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";
import {
  AREAS,
  FORM_FIELDS,
  PHOTO_MAX_BYTES,
  PHOTO_TYPES,
  STATUS,
  STATUS_ORDER,
  TYPES,
  formatDate,
  type Activity,
  type ActivityPhoto,
  type StatusKey,
} from "@/lib/cmg";
import { buildActivityReport, type ReportPhoto } from "@/lib/reports";

export const Route = createFileRoute("/_authenticated/atividades/$activityId")({
  head: () => ({
    meta: [
      { title: "Detalhes da atividade — CMG" },
      {
        name: "description",
        content: "Atualização do status, execução e evidências da atividade.",
      },
      { property: "og:title", content: "Detalhes da atividade — CMG" },
      {
        property: "og:description",
        content: "Registro operacional completo da atividade de facilities.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ActivityDetailPage,
});

function ActivityDetailPage() {
  const { activityId } = Route.useParams();
  const session = useSession();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [photos, setPhotos] = useState<ActivityPhoto[]>([]);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [photoCaption, setPhotoCaption] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const loadActivity = useCallback(async () => {
    const { data, error } = await supabase.from("activities").select("*").eq("id", activityId).maybeSingle();

    if (error) {
      toast.error("Não foi possível carregar a atividade");
      setLoading(false);
      return;
    }

    const nextActivity = data as Activity | null;
    setActivity(nextActivity);
    setFormData(nextActivity?.form_data ?? {});
    setLoading(false);
  }, [activityId]);

  const loadPhotos = useCallback(async () => {
    const { data, error } = await supabase
      .from("activity_photos")
      .select("*")
      .eq("activity_id", activityId)
      .order("created_at", { ascending: true });

    if (error) {
      toast.error("Não foi possível carregar as evidências");
      return;
    }

    const nextPhotos = (data as ActivityPhoto[]) ?? [];
    setPhotos(nextPhotos);

    const paths = nextPhotos.map((photo) => photo.storage_path);
    if (paths.length === 0) {
      setSignedUrls({});
      return;
    }

    const { data: urlRows } = await supabase.storage.from("activity-photos").createSignedUrls(paths, 3600);
    const urls: Record<string, string> = {};
    urlRows?.forEach((row, index) => {
      const path = paths[index];
      if (path && row.signedUrl) urls[path] = row.signedUrl;
    });
    setSignedUrls(urls);
  }, [activityId]);

  useEffect(() => {
    void loadActivity();
    void loadPhotos();

    const channel = supabase
      .channel(`activity-detail-rebuilt-${activityId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "activities", filter: `id=eq.${activityId}` },
        () => void loadActivity(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "activity_photos", filter: `activity_id=eq.${activityId}` },
        () => void loadPhotos(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [activityId, loadActivity, loadPhotos]);

  if (session.loading || loading) return <ActivityDetailSkeleton />;
  if (!session.userId) throw redirect({ to: "/" });
  if (!activity) {
    return (
      <AppShell session={session} title="Atividade não encontrada">
        <div className="panel p-8 text-center text-muted-foreground">
          Este registro não está disponível para o seu perfil.
        </div>
      </AppShell>
    );
  }

  const readonly = activity.status === "concluida";

  const saveExecution = async () => {
    setBusy(true);
    const { error } = await supabase.from("activities").update({ form_data: formData }).eq("id", activity.id);
    setBusy(false);

    if (error) {
      toast.error("Não foi possível salvar o registro");
      return;
    }

    toast.success("Registro salvo");
    await loadActivity();
  };

  const updateStatus = async (status: StatusKey) => {
    if (status === activity.status) return;

    if (status === "concluida") {
      const missingField = FORM_FIELDS[activity.activity_type].find((field) => !formData[field.key]?.trim());
      if (missingField) {
        toast.error(`Preencha o campo: ${missingField.label}`);
        return;
      }
    }

    setBusy(true);
    const { error } = await supabase
      .from("activities")
      .update({
        form_data: formData,
        status,
        completed_at: status === "concluida" ? new Date().toISOString() : null,
      })
      .eq("id", activity.id);
    setBusy(false);

    if (error) {
      toast.error("Não foi possível atualizar o status da atividade");
      return;
    }

    toast.success(status === "concluida" ? "Atividade concluída" : `Status alterado para ${STATUS[status].toLocaleLowerCase("pt-BR")}`);
    await loadActivity();
  };

  const handlePhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!PHOTO_TYPES.includes(file.type)) {
      toast.error("Envie somente imagens JPEG ou PNG");
      return;
    }
    if (file.size > PHOTO_MAX_BYTES) {
      toast.error("A imagem deve ter no máximo 50 MB");
      return;
    }

    const extension = file.type === "image/png" ? "png" : "jpg";
    const storagePath = `${activity.id}/${crypto.randomUUID()}.${extension}`;
    setBusy(true);

    const { error: uploadError } = await supabase.storage
      .from("activity-photos")
      .upload(storagePath, file, { contentType: file.type });

    if (uploadError) {
      setBusy(false);
      toast.error("Não foi possível enviar a foto");
      return;
    }

    const { error: recordError } = await supabase.from("activity_photos").insert({
      activity_id: activity.id,
      storage_path: storagePath,
      caption: photoCaption.trim() || null,
      uploaded_by: session.userId,
    });

    if (recordError) {
      await supabase.storage.from("activity-photos").remove([storagePath]);
      setBusy(false);
      toast.error("Não foi possível registrar a foto");
      return;
    }

    setPhotoCaption("");
    setBusy(false);
    toast.success("Foto anexada");
    await loadPhotos();
  };

  const removePhoto = async (photo: ActivityPhoto) => {
    setBusy(true);
    const { error } = await supabase.from("activity_photos").delete().eq("id", photo.id);

    if (error) {
      setBusy(false);
      toast.error("Não foi possível excluir a foto");
      return;
    }

    await supabase.storage.from("activity-photos").remove([photo.storage_path]);
    setBusy(false);
    toast.success("Foto excluída");
    await loadPhotos();
  };

  const downloadReport = async () => {
    if (activity.status !== "concluida") return;
    setBusy(true);

    try {
      const reportPhotos: ReportPhoto[] = [];
      for (const photo of photos) {
        const { data } = await supabase.storage.from("activity-photos").download(photo.storage_path);
        if (!data) continue;
        reportPhotos.push({
          caption: photo.caption,
          dataUrl: await blobToDataUrl(data),
          format: data.type === "image/png" ? "PNG" : "JPEG",
        });
      }

      const { data: analyst } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", activity.assigned_to)
        .maybeSingle();
      const document = await buildActivityReport(
        activity,
        analyst?.full_name ?? session.profile?.full_name ?? "Analista",
        reportPhotos,
      );
      document.save(`CMG-${activity.title.replace(/[^a-z0-9]+/gi, "-")}.pdf`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell
      session={session}
      title={activity.title}
      subtitle={`${TYPES[activity.activity_type]} • ${AREAS[activity.area]}`}
    >
      <div className="mb-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        <Badge variant={readonly ? "secondary" : "default"}>{STATUS[activity.status]}</Badge>
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <CalendarDays className="size-4" aria-hidden="true" />
          Programada para {formatDate(activity.scheduled_date)}
        </span>
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <MapPin className="size-4" aria-hidden="true" />
          {activity.location || "Local não informado"}
        </span>
      </div>

      <div className="grid gap-5">
        <section className="panel grid gap-5 p-5 sm:grid-cols-[1fr_18rem] sm:items-end sm:p-6">
          <div>
            <p className="text-xs font-semibold uppercase text-primary">Atualização da atividade</p>
            <h2 className="mt-2 text-lg font-semibold">Status da atividade</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Selecione a etapa que representa o andamento atual do serviço.
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="activity-status">Situação atual</Label>
            <Select
              value={activity.status}
              onValueChange={(value) => void updateStatus(value as StatusKey)}
              disabled={busy}
            >
              <SelectTrigger id="activity-status" className="h-11 w-full" aria-label="Situação atual">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_ORDER.map((status) => (
                  <SelectItem key={status} value={status}>{STATUS[status]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </section>

        <section className="panel p-5 sm:p-6">
          <h2 className="text-lg font-semibold">Escopo delegado</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
            {activity.description || "Sem instruções adicionais para esta atividade."}
          </p>
        </section>

        <section className="panel p-5 sm:p-6">
          <h2 className="text-lg font-semibold">Registro de execução</h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            {FORM_FIELDS[activity.activity_type].map((field) => (
              <div key={field.key} className={`grid gap-2 ${field.long ? "sm:col-span-2" : ""}`}>
                <Label htmlFor={`field-${field.key}`}>{field.label}</Label>
                {field.long ? (
                  <Textarea
                    id={`field-${field.key}`}
                    rows={4}
                    maxLength={3000}
                    value={formData[field.key] ?? ""}
                    disabled={readonly || busy}
                    onChange={(event) => setFormData((current) => ({ ...current, [field.key]: event.target.value }))}
                  />
                ) : (
                  <Input
                    id={`field-${field.key}`}
                    maxLength={200}
                    value={formData[field.key] ?? ""}
                    disabled={readonly || busy}
                    onChange={(event) => setFormData((current) => ({ ...current, [field.key]: event.target.value }))}
                  />
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="panel p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <Camera className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
            <div>
              <h2 className="text-lg font-semibold">Evidências fotográficas</h2>
              <p className="text-sm text-muted-foreground">JPEG ou PNG • até 50 MB por arquivo</p>
            </div>
          </div>

          {!readonly ? (
            <div className="mt-5 grid gap-4 rounded-md border border-dashed p-4 md:grid-cols-[1fr_auto] md:items-end">
              <div className="grid gap-2">
                <Label htmlFor="photo-caption">Legenda da próxima foto</Label>
                <Input
                  id="photo-caption"
                  value={photoCaption}
                  maxLength={240}
                  placeholder="Ex.: Condição encontrada no Lado A"
                  onChange={(event) => setPhotoCaption(event.target.value)}
                  disabled={busy}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" disabled={busy}>
                  <label className="cursor-pointer">
                    <Camera className="size-4" aria-hidden="true" />
                    Câmera
                    <input className="sr-only" type="file" accept="image/jpeg,image/png" capture="environment" onChange={handlePhoto} />
                  </label>
                </Button>
                <Button asChild variant="outline" disabled={busy}>
                  <label className="cursor-pointer">
                    <ImagePlus className="size-4" aria-hidden="true" />
                    Galeria
                    <input className="sr-only" type="file" accept="image/jpeg,image/png" onChange={handlePhoto} />
                  </label>
                </Button>
              </div>
            </div>
          ) : null}

          {photos.length > 0 ? (
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {photos.map((photo) => (
                <figure key={photo.id} className="overflow-hidden rounded-md border bg-muted">
                  <img
                    src={signedUrls[photo.storage_path]}
                    alt={photo.caption || "Evidência da atividade"}
                    className="aspect-[4/3] w-full object-cover"
                  />
                  <figcaption className="flex min-h-14 items-start justify-between gap-2 p-3 text-sm">
                    <span>{photo.caption || "Sem legenda"}</span>
                    {!readonly ? (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => void removePhoto(photo)}
                        disabled={busy}
                        aria-label="Excluir foto"
                      >
                        <Trash2 className="size-4 text-destructive" aria-hidden="true" />
                      </Button>
                    ) : null}
                  </figcaption>
                </figure>
              ))}
            </div>
          ) : (
            <p className="mt-5 rounded-md bg-muted p-4 text-sm text-muted-foreground">
              Nenhuma evidência fotográfica anexada.
            </p>
          )}
        </section>
      </div>

      <div className="sticky bottom-0 z-10 mt-6 flex flex-wrap justify-end gap-2 border-t bg-background/95 py-4 backdrop-blur">
        {!readonly ? (
          <>
            <Button variant="outline" onClick={() => void saveExecution()} disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Salvar
            </Button>
            <Button onClick={() => void updateStatus("concluida")} disabled={busy}>
              <CheckCircle2 className="size-4" aria-hidden="true" />
              Concluir atividade
            </Button>
          </>
        ) : (
          <Button onClick={() => void downloadReport()} disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <FileDown className="size-4" />}
            Gerar relatório PDF
          </Button>
        )}
      </div>
    </AppShell>
  );
}

function ActivityDetailSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <Skeleton className="h-9 w-80 max-w-full" />
      <Skeleton className="mt-3 h-5 w-72 max-w-full" />
      <Skeleton className="mt-8 h-32 w-full" />
      <Skeleton className="mt-5 h-40 w-full" />
      <Skeleton className="mt-5 h-72 w-full" />
    </div>
  );
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
