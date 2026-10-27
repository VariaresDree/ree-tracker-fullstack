// src/pages/PaperSetResults.jsx
//
// Exams > Paper sets > Results (/exams/paper-sets/:setId): one printed set's
// scanned sheets. The takers' scores (with the general average and verdict on
// PRC papers), each sheet to view, correct or delete, the item analysis (how
// many got each item, what they chose instead, and from 10 takers how well
// each item separates strong takers from weak ones), the most-missed items
// with their questions typeset, and both as CSV.
//
// Every sheet is scored here against the set's current key with the shared
// scorePaperSheet, the function the server scores with, so a sheet still
// waiting to sync shows its score too. Self-checks are left out unless asked
// for: they are you, not a taker.
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { VERDICT, formatPrintId, normalizePrintId, scorePaperSheet } from '@ree/shared';
import LatexRenderer from '../components/LatexRenderer';
import {
  Button, Card, DataTable, EmptyState, Grid, KpiTile, Modal, Page, PageHeader, Panel, Skeleton, StatusPill,
} from '../components/ui';
import {
  BarChart3, ChevronLeft, CloudOff, Copy, Download, FileText, Pencil, Printer, ScanLine, Target, Trash2, Users,
} from '../components/ui/icons';
import { canDownloadFiles, copyText, downloadBlob } from '../features/exam-export/deliver';
import { usePrintedSet } from '../features/paper-sets/usePrintedSet';
import { useSetSheets } from '../features/paper-sets/useSetSheets';
import {
  DISCRIMINATION_MIN_TAKERS, countedSheets, itemAnalysis, scoreSheet, scoringSet,
} from '../features/paper-sets/results/itemAnalysis';
import {
  csvFileName, manilaDateTime, sheetName, toItemAnalysisCsv, toResultsCsv,
} from '../features/paper-sets/results/resultsCsv';
import SheetEditor from '../features/paper-sets/results/SheetEditor';
import { selfCheckEntry } from '../features/paper-sets/scan/scanModel';
import { useOutsideScores } from '../features/exams/useOutsideScores';

const VERDICT_LABEL = { [VERDICT.PASSED]: 'Passed', [VERDICT.CONDITIONAL]: 'Conditional', [VERDICT.FAILED]: 'Failed' };
const pct = (n) => (n == null ? '\u2014' : `${Math.round(n * 10) / 10}%`);
const icon = (Icon) => <Icon size={16} strokeWidth={1.75} aria-hidden="true" />;

const STATUS_COPY = {
  'not-found': ['Paper set not found', 'It may have been deleted, or it was made on another account.'],
  'offline-missing': ['This paper set isn\u2019t on this device yet', 'Connect to the internet to open it. Once it has opened here, it opens offline too.'],
  error: ['The paper set couldn\u2019t load', 'Try again in a moment.'],
};

function Missing({ status }) {
  if (status === 'loading') {
    return (
      <Page>
        <PageHeader title="Results" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </Page>
    );
  }
  const [title, body] = STATUS_COPY[status] || STATUS_COPY.error;
  return (
    <Page>
      <PageHeader title={title} />
      <EmptyState
        icon={FileText}
        title={body}
        action={<Button as={Link} to="/exams?tab=paper" size="sm">Back to Paper sets</Button>}
      />
    </Page>
  );
}

const TH = 'py-2.5 px-3 text-micro font-mono uppercase tracking-[0.14em] text-muted font-medium whitespace-nowrap';
const TD = 'py-2.5 px-3 text-sm text-textMain tabular-nums';

/**
 * Every item, one row each: dense figures, so a real table that scrolls
 * sideways on a phone (as stacked cards, a 100-item paper ran to a thousand
 * lines).
 */
function ItemTable({ items, letters, discriminating }) {
  return (
    // Focusable, so the keyboard can scroll it.
    <div className="overflow-x-auto" role="region" aria-label="Every item, scrolls sideways" tabIndex={0}>
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-border">
            <th scope="col" className={`${TH} text-left`}>Item</th>
            <th scope="col" className={`${TH} text-left`}>Key</th>
            <th scope="col" className={`${TH} text-right`}>Correct</th>
            {letters.map((l) => <th key={l} scope="col" className={`${TH} text-right`}>{l}</th>)}
            <th scope="col" className={`${TH} text-right`}>Blank</th>
            <th scope="col" className={`${TH} text-right`}>Two marks</th>
            <th scope="col" className={`${TH} text-left`}>Most chose</th>
            {discriminating && <th scope="col" className={`${TH} text-right`}>Discrimination</th>}
          </tr>
        </thead>
        <tbody>
          {items.map((x) => (
            <tr key={x.n} className="border-b border-border/60 last:border-0">
              <th scope="row" className={`${TD} text-left font-medium`}>{x.n}</th>
              <td className={TD}>{x.key || '\u2014'}</td>
              <td className={`${TD} text-right`}>{x.p == null ? '\u2014' : pct(x.p * 100)}</td>
              {letters.map((l) => <td key={l} className={`${TD} text-right`}>{l in x.counts ? x.counts[l] : ''}</td>)}
              <td className={`${TD} text-right`}>{x.counts.blank}</td>
              <td className={`${TD} text-right`}>{x.counts.multiple}</td>
              <td className={TD}>{x.topWrong || '\u2014'}</td>
              {discriminating && <td className={`${TD} text-right`}>{x.discrimination == null ? '\u2014' : x.discrimination.toFixed(2)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Results({ set, draw, sheetsApi }) {
  const [includeSelf, setIncludeSelf] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [message, setMessage] = useState('');
  const downloads = canDownloadFiles();
  const history = useOutsideScores();

  const keyed = useMemo(() => scoringSet(set), [set]);
  const all = useMemo(() => sheetsApi.sheets || [], [sheetsApi.sheets]);
  const selfCount = all.filter((s) => s.isSelf).length;
  const sheets = useMemo(
    () => countedSheets(all, includeSelf).slice().sort((a, b) => String(b.scannedAt || '').localeCompare(String(a.scannedAt || ''))),
    [all, includeSelf],
  );
  const scores = useMemo(() => new Map(sheets.map((s) => [s.id, scoreSheet(keyed, s)])), [sheets, keyed]);
  const analysis = useMemo(() => itemAnalysis(set, sheets, { includeSelf: true }), [set, sheets]);
  const prc = String(set.profile || '').startsWith('prc');
  const widest = Math.max(0, ...keyed.items.map((it) => Math.min(6, (it.options || []).length)));
  const letters = ['A', 'B', 'C', 'D', 'E', 'F'].slice(0, widest);
  const discriminating = analysis.takers >= DISCRIMINATION_MIN_TAKERS;
  const itemsByN = useMemo(() => new Map(keyed.items.map((it) => [it.n, it])), [keyed.items]);

  // A corrected self-check moves its history entry to the new score too.
  // The entry keeps its own title, date and retest link; the note is
  // rewritten only while it is still the one the scanner wrote.
  const correctHistory = async (sheet, answers) => {
    const entry = sheet.outsideScoreId && (history.items || []).find((e) => e.id === sheet.outsideScoreId);
    if (!entry) return;
    const next = selfCheckEntry({ set, draw, score: scorePaperSheet(keyed, answers), takenOn: entry.takenOn, id: entry.id });
    if (next.total < 1) return;
    const ours = String(entry.note || '').startsWith(`Printed set ${formatPrintId(set.id)}.`);
    await history.update(entry.id, {
      title: entry.title,
      source: entry.source ?? null,
      takenOn: entry.takenOn,
      subject: entry.subject,
      score: next.score,
      total: next.total,
      note: ours ? next.note : (entry.note ?? null),
      retestOfId: entry.retestOfId ?? null,
    });
  };

  const deliver = async (kind) => {
    const csv = kind === 'results' ? toResultsCsv(set, sheets) : toItemAnalysisCsv(set, analysis);
    const name = csvFileName(set, kind === 'results' ? 'results' : 'item-analysis');
    if (downloads) {
      downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), name);
      setMessage(`Downloaded ${name}.`);
    } else {
      const ok = await copyText(csv);
      setMessage(ok ? `Copied ${name}. Paste it into a spreadsheet.` : `Couldn\u2019t copy ${name}.`);
    }
  };

  const confirmDelete = async () => {
    const sheet = confirm;
    setConfirm(null);
    try {
      await sheetsApi.remove(sheet.id);
    } catch (err) {
      toast.error(`The sheet wasn\u2019t deleted. ${err?.message || 'Try again.'}`);
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      sortAccessor: (s) => sheetName(s).toLowerCase(),
      render: (s) => <span className="[overflow-wrap:anywhere]">{sheetName(s)}</span>,
    },
    { key: 'score', label: 'Score', align: 'right', sortable: true, sortAccessor: (s) => scores.get(s.id).correct, render: (s) => `${scores.get(s.id).correct} of ${scores.get(s.id).scored}` },
    { key: 'percent', label: '%', align: 'right', sortable: true, sortAccessor: (s) => scores.get(s.id).percent, render: (s) => pct(scores.get(s.id).percent) },
    ...(prc ? [{
      key: 'verdict',
      label: 'Verdict',
      render: (s) => {
        const r = scores.get(s.id);
        return r.verdict ? <StatusPill status={r.verdict}>{`${VERDICT_LABEL[r.verdict] || r.verdict} \u00B7 ${pct(r.generalAverage)}`}</StatusPill> : '\u2014';
      },
    }] : []),
    {
      key: 'scanned',
      label: 'Scanned',
      sortable: true,
      sortAccessor: (s) => String(s.scannedAt || ''),
      render: (s) => <span className="text-muted2 whitespace-nowrap">{manilaDateTime(s.scannedAt)}</span>,
    },
    {
      key: 'actions',
      label: <span className="sr-only">Actions</span>,
      align: 'right',
      render: (s) => (
        <span className="inline-flex items-center gap-1">
          <Button size="sm" variant="ghost" onClick={() => setEditing(s)} aria-label={`View or correct ${sheetName(s)}`}>
            {icon(Pencil)}
            View
          </Button>
          <Button size="icon" variant="ghost" tone="danger" onClick={() => setConfirm(s)} aria-label={`Delete ${sheetName(s)}`}>
            <Trash2 size={15} strokeWidth={1.75} aria-hidden="true" />
          </Button>
        </span>
      ),
    },
  ];


  const editingScore = editing ? scoreSheet(keyed, editing) : null;

  return (
    <Page>
      <PageHeader
        title={`${draw.setLabel} results`}
        subtitle={`${draw.plan?.title || set.title} \u00B7 Set code ${formatPrintId(set.id)}`}
        actions={(
          <>
            <Button as={Link} to="/exams?tab=paper" variant="ghost" size="sm">
              {icon(ChevronLeft)}
              Paper sets
            </Button>
            <Button as={Link} to={`/print/${set.id}`} variant="secondary" size="sm">
              {icon(Printer)}
              Print
            </Button>
            <Button as={Link} to={`/scan/${set.id}?for=taker`} size="sm">
              {icon(ScanLine)}
              Scan sheets
            </Button>
          </>
        )}
      />

      {(sheetsApi.queuedCount > 0 || sheetsApi.status === 'offline' || sheetsApi.status === 'unreachable') && (
        <p role="status" className="flex items-center gap-2 text-xs text-muted2">
          {icon(CloudOff)}
          {sheetsApi.queuedCount > 0
            ? `${sheetsApi.queuedCount} change${sheetsApi.queuedCount === 1 ? '' : 's'} saved on this device, waiting to sync.`
            : 'Offline. Showing the sheets saved on this device.'}
        </p>
      )}

      {/* Five tiles on a PRC paper: one row where there is room. */}
      <Grid kind="kpi" gap="sm" className={prc ? '@4xl:grid-cols-5' : undefined}>
        <KpiTile compact label="Takers" value={String(analysis.takers)} />
        <KpiTile compact label="Mean" value={pct(analysis.mean)} hint={analysis.sd == null ? undefined : `SD ${analysis.sd}`} />
        <KpiTile compact label="Highest" value={pct(analysis.highest)} />
        <KpiTile compact label="Lowest" value={pct(analysis.lowest)} />
        {prc && <KpiTile compact label="Pass rate" value={pct(analysis.passRate)} hint="Passed or conditional" />}
      </Grid>

      <Panel
        icon={Users}
        eyebrow="Scanned sheets"
        title="Takers"
        action={(
          <label className="flex items-center gap-2 text-sm text-textMain cursor-pointer pointer-coarse:min-h-11">
            <input type="checkbox" className="h-4 w-4 accent-[var(--accent)]" checked={includeSelf} onChange={(e) => setIncludeSelf(e.target.checked)} />
            {`Include self-checks${selfCount ? ` (${selfCount})` : ''}`}
          </label>
        )}
        bodyClassName="flex flex-col gap-3"
      >
        {sheetsApi.sheets == null ? (
          <Skeleton className="h-24 w-full" />
        ) : sheets.length === 0 ? (
          <EmptyState
            compact
            icon={ScanLine}
            title="No sheets scanned yet"
            description={selfCount && !includeSelf
              ? 'Only self-checks so far. Include them to see them here.'
              : 'Scan the answer sheets with your phone. Each one is scored against this set\u2019s key.'}
            action={<Button as={Link} to={`/scan/${set.id}?for=taker`} size="sm">Scan sheets</Button>}
          />
        ) : (
          <DataTable columns={columns} rows={sheets} rowKey={(s) => s.id} />
        )}
        {sheets.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => deliver('results')}>
              {downloads ? icon(Download) : icon(Copy)}
              {downloads ? 'Download results CSV' : 'Copy results CSV'}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => deliver('items')}>
              {downloads ? icon(Download) : icon(Copy)}
              {downloads ? 'Download item analysis CSV' : 'Copy item analysis CSV'}
            </Button>
            <span aria-live="polite" className="text-xs text-muted2">{message}</span>
          </div>
        )}
      </Panel>

      {sheets.length > 0 && (
        <>
          <Panel
            icon={Target}
            eyebrow="Item analysis"
            title="Most-missed items"
            bodyClassName="flex flex-col gap-3"
          >
            {analysis.mostMissed.length === 0 ? (
              <p className="text-sm text-muted2">Every taker got every scored item right.</p>
            ) : (
              <ol className="flex flex-col gap-3">
                {analysis.mostMissed.map((x) => {
                  const it = itemsByN.get(x.n);
                  return (
                    <li key={x.n}>
                      <Card padding="sm" glass={false} className="flex flex-col gap-2">
                        <p className="text-sm text-muted2 tabular-nums">
                          <strong className="text-textMain">{`Item ${x.n}`}</strong>
                          {` \u00B7 ${pct(x.p * 100)} correct \u00B7 key ${x.key}`}
                          {x.topWrong ? ` \u00B7 most chose ${x.topWrong} (${x.counts[x.topWrong]})` : ''}
                        </p>
                        <LatexRenderer content={it?.text || ''} className="text-sm text-textMain" />
                      </Card>
                    </li>
                  );
                })}
              </ol>
            )}
          </Panel>

          <Panel icon={BarChart3} eyebrow="Item analysis" title="Every item" bodyClassName="flex flex-col gap-3">
            <p className="text-xs text-muted2">
              {discriminating
                ? 'Correct: the share who chose the key. Discrimination: the top 27% of takers minus the bottom 27% on that item; under 0.2 is weak.'
                : `Correct: the share who chose the key. Discrimination shows from ${DISCRIMINATION_MIN_TAKERS} takers.`}
            </p>
            <ItemTable items={analysis.items} letters={letters} discriminating={discriminating} />
          </Panel>
        </>
      )}

      {editing && (
        <SheetEditor
          key={editing.id}
          sheet={editing}
          items={keyed.items}
          perItem={editingScore.perItem}
          onClose={() => setEditing(null)}
          onSave={async (patch) => {
            await sheetsApi.patch(editing.id, patch);
            if (editing.isSelf && patch.answers) await correctHistory(editing, patch.answers);
          }}
        />
      )}

      <Modal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        tone="danger"
        icon={Trash2}
        size="sm"
        title={confirm ? `Delete ${sheetName(confirm)}\u2019s sheet?` : ''}
        footer={(
          <>
            <Button variant="secondary" size="sm" onClick={() => setConfirm(null)}>Cancel</Button>
            <Button variant="danger" size="sm" onClick={confirmDelete}>Delete</Button>
          </>
        )}
      >
        <p className="text-sm text-muted2">
          {confirm?.isSelf
            ? 'The sheet is removed from this set\u2019s results. The self-check stays in your history.'
            : 'The sheet and its score are removed from this set\u2019s results. This can\u2019t be undone.'}
        </p>
      </Modal>
    </Page>
  );
}

export default function PaperSetResults() {
  const { setId } = useParams();
  const id = normalizePrintId(setId);
  const ps = usePrintedSet(id);
  const sheetsApi = useSetSheets(id);
  if (!id) return <Missing status="not-found" />;
  if (ps.status !== 'ready' || !ps.set || !ps.draw) return <Missing status={ps.status} />;
  return <Results set={ps.set} draw={ps.draw} sheetsApi={sheetsApi} />;
}
