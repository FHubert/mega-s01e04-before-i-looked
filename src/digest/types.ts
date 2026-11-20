// Plan morning-digest § 1. The contract every part of § 2 starts against.

export type RunStatus = 'ok' | 'retry' | 'fail';

/** One line of runs/<night>.jsonl, after parsing. */
export type RunLine = {
  at: string;
  job: string;
  status: RunStatus;
  owner: string | null;
  error?: string;
};

/** One row per job for a night. Times keep the offset from the log (styleguide). */
export type DigestRow = {
  job: string;
  /** Owner on the job's last line; `null` renders as `—`. */
  owner: string | null;
  /** Lines for this job. */
  runs: number;
  /** Lines for this job with status `retry`. */
  retries: number;
  lastStatus: RunStatus;
  /** Error on the job's last line, or `null`. */
  lastError: string | null;
  firstAt: string;
  lastAt: string;
};

export type DigestNight = {
  night: string;
  /** Sorted by job. The page and the JSON both use this order. */
  rows: DigestRow[];
  /** Lines that did not parse as a run line. Counted, never thrown. */
  badLines: number;
};

/**
 * Reads runs/<night>.jsonl. Returns `null` when the night has no file (or the night is not
 * a YYYY-MM-DD date). An empty file returns `{ rows: [], badLines: 0 }`.
 */
export type ReadNight = (runsDir: string, night: string) => DigestNight | null;
