"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, LoaderCircle, Save } from "lucide-react";
import { setTeamMemberWorkScheduleAction } from "@/app/people-actions";

type Schedule = "Turno" | "Administrativo" | null;

function normalizeSchedule(schedule: string | null): Schedule {
  const normalized = schedule?.trim().toLocaleLowerCase("pt-BR") ?? "";
  if (normalized.includes("adm")) return "Administrativo";
  if (normalized.includes("turn")) return "Turno";
  return null;
}

export function WorkScheduleEditor({
  userId,
  name,
  schedule,
  available = true,
}: {
  userId: string;
  name: string;
  schedule: string | null;
  available?: boolean;
}) {
  const initialSchedule = normalizeSchedule(schedule);
  const [value, setValue] = useState<Schedule>(initialSchedule);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const changed = value !== initialSchedule;

  function save() {
    startTransition(async () => {
      const result = await setTeamMemberWorkScheduleAction({
        userId,
        schedule: value,
      });
      if (result.error) {
        setMessage(result.error);
        return;
      }
      setMessage("Salvo");
      router.refresh();
    });
  }

  return <div className="work-schedule-editor">
    <select
      aria-label={`Horário de trabalho de ${name}`}
      className="field"
      disabled={!available || isPending}
      value={value ?? ""}
      onChange={(event) => {
        const selected = event.target.value;
        setValue(selected === "Turno" || selected === "Administrativo" ? selected : null);
        setMessage("");
      }}
    >
      <option value="">Não definido</option>
      <option value="Turno">Turno</option>
      <option value="Administrativo">Administrativo</option>
    </select>
    {changed && <button className="button-secondary" type="button" disabled={isPending || !available} onClick={save} aria-label={`Salvar horário de ${name}`}>
      {isPending ? <LoaderCircle size={14} className="work-schedule-spinner" /> : <Save size={14} />}
      Salvar
    </button>}
    {message && <span className={message === "Salvo" ? "work-schedule-success" : "work-schedule-error"} role="status">
      {message === "Salvo" && <Check size={12} />}{message}
    </span>}
    {!available && <span className="muted" style={{ fontSize: 10 }}>Sem cadastro vinculado</span>}
  </div>;
}
