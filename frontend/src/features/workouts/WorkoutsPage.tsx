import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { WifiOff } from "lucide-react";
import { getErrorMessage } from "@/data/api";
import {
  workoutsRepository,
  type Block,
  type Library as LibraryData,
  type SourceType,
} from "@/data/repositories/workoutsRepository";
import { useNow } from "@/hooks/useNow";
import Library from "./components/Library";
import MonthHistory from "./components/MonthHistory";
import TimerModal from "./components/TimerModal";
import TodayCard from "./components/TodayCard";
import { useDay } from "./hooks/useDay";
import { useLibrary } from "./hooks/useLibrary";
import { TODAY_DROP_ID, readLibraryDragId } from "./utils/dragIds";

function titleOf(library: LibraryData | null, sourceType: SourceType, sourceId: string): string {
  if (!library) return "";
  if (sourceType === "standalone") return library.standalone.find((w) => w.id === sourceId)?.name ?? "";
  for (const program of library.programs) {
    const session = program.sessions.find((s) => s.id === sourceId);
    if (session) return `${program.name} · Dia ${session.number}`;
  }
  return "";
}

export default function WorkoutsPage() {
  const now = useNow();
  const today = format(now, "yyyy-MM-dd");
  const { day, offline, error, updateBlock, change: changeDay } = useDay(today);
  const { library, error: libraryError, reload: reloadLibrary } = useLibrary();

  const [timerBlockId, setTimerBlockId] = useState<string | null>(null);
  const [draggingTitle, setDraggingTitle] = useState<string | null>(null);
  const [libraryActionError, setLibraryActionError] = useState<string | null>(null);
  // Changes whenever today's blocks change, so the month history fetches again
  const [historyKey, setHistoryKey] = useState(0);

  // Mouse drags after moving 6px; touch needs a short hold, so scrolling still works
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 6 } })
  );

  const refreshHistory = () => setHistoryKey((key) => key + 1);

  async function changeLibrary(action: () => Promise<unknown>): Promise<boolean> {
    setLibraryActionError(null);
    try {
      await action();
      await reloadLibrary();
      return true;
    } catch (e) {
      setLibraryActionError(getErrorMessage(e));
      return false;
    }
  }

  async function addToToday(sourceType: SourceType, sourceId: string) {
    if (await changeDay(() => workoutsRepository.addBlock(today, sourceType, sourceId))) {
      refreshHistory();
    }
  }

  function onDragStart(e: DragStartEvent) {
    const item = readLibraryDragId(String(e.active.id));
    setDraggingTitle(item ? titleOf(library, item.sourceType, item.sourceId) : null);
  }

  function onDragEnd(e: DragEndEvent) {
    setDraggingTitle(null);
    const item = readLibraryDragId(String(e.active.id));
    if (item && e.over?.id === TODAY_DROP_ID) void addToToday(item.sourceType, item.sourceId);
  }

  function toggleDone(block: Block, done: boolean) {
    void updateBlock(block, { state: done ? "done" : "not_started" }).then(refreshHistory);
  }

  function removeBlock(block: Block) {
    void changeDay(() => workoutsRepository.deleteBlock(block.id)).then(refreshHistory);
  }

  const timerBlock = day?.blocks.find((b) => b.id === timerBlockId);
  const pageError = error ?? libraryError ?? libraryActionError;

  return (
    <div className="mx-auto flex max-w-[1500px] flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">Treinos</h1>
        <p className="text-sm capitalize text-muted">
          {format(now, "EEEE, d 'de' MMMM", { locale: ptBR })}
        </p>
      </div>

      {offline && (
        <p className="flex items-center gap-2 rounded-lg border border-primary/40 px-3 py-2 text-sm text-primary">
          <WifiOff size={16} className="shrink-0" />
          Sem internet: o cronômetro e as marcações funcionam e são enviados quando a conexão voltar.
        </p>
      )}
      {pageError && (
        <p className="rounded-lg border border-red-400/40 px-3 py-2 text-sm text-red-400">{pageError}</p>
      )}

      <DndContext
        sensors={sensors}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={() => setDraggingTitle(null)}
      >
        <div className="grid items-start gap-4 xl:grid-cols-[18rem_1fr_20rem]">
          <div className="order-3 xl:order-1">
            <MonthHistory refreshKey={historyKey} />
          </div>
          <div className="order-1 xl:order-2">
            {day ? (
              <TodayCard
                day={day}
                onStart={(block) => setTimerBlockId(block.id)}
                onToggleDone={toggleDone}
                onRemove={removeBlock}
              />
            ) : (
              <p className="py-10 text-center text-muted">{offline ? "Sem conexão." : "Carregando…"}</p>
            )}
          </div>
          <div className="order-2 xl:order-3">
            {library ? (
              <Library library={library} onAdd={(t, id) => void addToToday(t, id)} onChange={changeLibrary} />
            ) : (
              <p className="py-10 text-center text-muted">Carregando biblioteca…</p>
            )}
          </div>
        </div>

        <DragOverlay>
          {draggingTitle && (
            <div className="rounded-lg border border-primary bg-surface px-3 py-2 text-sm shadow-lg">
              {draggingTitle}
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {timerBlock && (
        <TimerModal
          block={timerBlock}
          onProgress={(progress) => void updateBlock(timerBlock, progress)}
          onFinish={() => void updateBlock(timerBlock, { state: "done" }).then(refreshHistory)}
          onClose={() => setTimerBlockId(null)}
        />
      )}
    </div>
  );
}
