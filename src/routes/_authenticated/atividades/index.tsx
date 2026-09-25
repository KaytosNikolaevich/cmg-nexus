import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, ClipboardCheck, MapPin, Wrench } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSession } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";
import {
  AREAS,
  STATUS,
  STATUS_ORDER,
  TYPES,
  formatDate,
  type Activity,
  type StatusKey,
} from "@/lib/cmg";

export const Route = createFileRoute("/_authenticated/atividades/")({
  head: () => ({
    meta: [
      { title: "Atividades da equipe — CMG" },
      {
        name: "description",
        content: "Acompanhamento das atividades operacionais da Torre Meridian.",
      },
      { property: "og:title", content: "Atividades da equipe — CMG" },
      {
        property: "og:description",
        content: "Acompanhamento das etapas e execução das atividades de facilities.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ActivitiesPage,
});

function ActivitiesPage() {
  const session = useSession();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  const loadActivities = useCallback(async () => {
    const { data, error } = await supabase
      .from("activities")
      .select("*")
      .order("scheduled_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Não foi possível carregar as atividades");
      setLoading(false);
      return;
    }

    setActivities((data as Activity[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadActivities();

    const channel = supabase
      .channel("activities-list-rebuilt")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "activities" },
        () => void loadActivities(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadActivities]);

  const groups = useMemo(
    () =>
      STATUS_ORDER.reduce<Record<StatusKey, Activity[]>>(
        (result, status) => {
          result[status] = activities.filter((activity) => activity.status === status);
          return result;
        },
        { pendente: [], em_andamento: [], pausada: [], concluida: [] },
      ),
    [activities],
  );

  if (session.loading || loading) return <ActivitiesSkeleton />;
  if (!session.userId) throw redirect({ to: "/" });

  return (
    <AppShell
      session={session}
      title={session.role === "gestao" ? "Atividades da equipe" : "Atividades delegadas"}
      subtitle="Acompanhe todas as etapas das atividades e abra um item para atualizar sua execução."
    >
      <Tabs defaultValue="em_andamento" className="w-full">
        <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto p-1">
          {STATUS_ORDER.map((status) => (
            <TabsTrigger key={status} value={status} className="min-h-10 shrink-0 px-4">
              <span>{STATUS[status]}</span>
              <span className="rounded-full bg-background px-2 py-0.5 text-xs text-foreground">
                {groups[status].length}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>

        {STATUS_ORDER.map((status) => (
          <TabsContent key={status} value={status} className="mt-5">
            <ActivityCards activities={groups[status]} status={status} />
          </TabsContent>
        ))}
      </Tabs>
    </AppShell>
  );
}

function ActivityCards({ activities, status }: { activities: Activity[]; status: StatusKey }) {
  if (activities.length === 0) {
    return (
      <div className="panel grid min-h-56 place-items-center p-8 text-center">
        <div className="max-w-sm">
          <ClipboardCheck className="mx-auto size-9 text-muted-foreground" aria-hidden="true" />
          <p className="mt-4 font-semibold">Nenhuma atividade {STATUS[status].toLocaleLowerCase("pt-BR")}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            As atividades desta etapa aparecerão aqui automaticamente.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {activities.map((activity) => (
        <Link
          key={activity.id}
          to="/atividades/$activityId"
          params={{ activityId: activity.id }}
          aria-label={`Abrir atividade ${activity.title}`}
          className="panel group flex min-h-64 flex-col p-5 transition duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-panel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-wrap gap-2">
              <Badge variant={statusVariant(activity.status)}>{STATUS[activity.status]}</Badge>
              <Badge variant="outline" className="max-w-full truncate">
                {TYPES[activity.activity_type]}
              </Badge>
            </div>
            <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
              <CalendarDays className="size-3.5" aria-hidden="true" />
              {formatDate(activity.scheduled_date)}
            </span>
          </div>

          <h2 className="mt-5 text-lg font-semibold leading-snug transition-colors group-hover:text-primary">
            {activity.title}
          </h2>
          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
            {activity.description || "Sem instruções adicionais."}
          </p>

          <div className="mt-auto grid gap-2 border-t pt-4 text-sm text-muted-foreground">
            <span className="flex min-w-0 items-center gap-2">
              <Wrench className="size-4 shrink-0 text-primary" aria-hidden="true" />
              <span className="truncate">{AREAS[activity.area]}</span>
            </span>
            <span className="flex min-w-0 items-center gap-2">
              <MapPin className="size-4 shrink-0 text-primary" aria-hidden="true" />
              <span className="truncate">{activity.location || "Local não informado"}</span>
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}

function statusVariant(status: StatusKey): "default" | "secondary" | "outline" {
  if (status === "concluida") return "secondary";
  if (status === "pendente") return "outline";
  return "default";
}

function ActivitiesSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <Skeleton className="h-9 w-72 max-w-full" />
      <Skeleton className="mt-3 h-5 w-96 max-w-full" />
      <Skeleton className="mt-8 h-12 w-full" />
      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((item) => <Skeleton key={item} className="h-64 w-full" />)}
      </div>
    </div>
  );
}
