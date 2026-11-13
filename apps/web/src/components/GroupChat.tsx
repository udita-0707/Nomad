import { useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { CHAT_MAX_LENGTH, type ChatMessage } from '@nomad/shared';
import { ApiError } from '../lib/api';
import { useChatLatest, useLoadEarlier, useSendMessage } from '../lib/useGroupChat';

const NEAR_BOTTOM_PX = 80;
const GROUP_WINDOW_MS = 5 * 60_000;
const COUNTER_FROM = 900;
// Message times are shown in the viewer's own time zone (S1-j).
const timeFormat = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

type Messages = Map<number, ChatMessage>;

function merge(prev: Messages, incoming: ChatMessage[]): Messages {
  if (incoming.every((m) => prev.has(m.id))) return prev;
  const next = new Map(prev);
  for (const m of incoming) next.set(m.id, m);
  return next;
}

function errorText(err: unknown) {
  if (err instanceof ApiError) return err.body.fields?.body ?? err.body.message;
  return 'Could not send right now. Please try again.';
}

// S1: the group chat on the Common Group Page. Messages are kept in one map by id:
// polls, "Load earlier" pages and sent messages are merged in and never removed,
// because the newest page slides forward as messages arrive.
export function GroupChat({ groupId }: { groupId: string }) {
  const [messages, setMessages] = useState<Messages>(() => new Map());
  const [hasMoreOlder, setHasMoreOlder] = useState<boolean | null>(null);
  const [text, setText] = useState('');
  const [showNew, setShowNew] = useState(false);

  const latest = useChatLatest(groupId);
  const earlier = useLoadEarlier(groupId);
  const addOne = useCallback((m: ChatMessage) => setMessages((prev) => merge(prev, [m])), []);
  const send = useSendMessage(groupId, addOne);

  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const nearBottom = useRef(true);
  const scrolledOnce = useRef(false);
  const prepend = useRef<{ height: number; top: number } | null>(null);
  const lastId = useRef(0);

  // Merge every poll result. hasMoreOlder comes from the first page, then from "Load earlier".
  useEffect(() => {
    if (!latest.data) return;
    setMessages((prev) => merge(prev, latest.data.messages));
    setHasMoreOlder((prev) => prev ?? latest.data.hasMore);
  }, [latest.data]);

  const sorted = [...messages.values()].sort((a, b) => a.id - b.id);
  const newest = sorted.at(-1);

  // Keep the reader's place: restore the offset after prepending, follow new messages
  // only when they were already near the bottom (or sent the message themselves).
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    if (prepend.current) {
      list.scrollTop = prepend.current.top + (list.scrollHeight - prepend.current.height);
      prepend.current = null;
      return;
    }
    const newestId = newest?.id ?? 0;
    if (newestId === lastId.current) return;
    lastId.current = newestId;
    if (!scrolledOnce.current || nearBottom.current || newest?.mine) {
      const first = !scrolledOnce.current;
      scrolledOnce.current = true;
      list.scrollTop = list.scrollHeight;
      nearBottom.current = true;
      setShowNew(false);
      // Web fonts can finish loading after the first render and make messages taller.
      if (first) document.fonts?.ready.then(() => { if (nearBottom.current) list.scrollTop = list.scrollHeight; });
    } else {
      setShowNew(true);
    }
  }, [messages, newest]);

  function onScroll() {
    const list = listRef.current;
    if (!list) return;
    nearBottom.current = list.scrollHeight - list.scrollTop - list.clientHeight <= NEAR_BOTTOM_PX;
    if (nearBottom.current) setShowNew(false);
  }

  function scrollToBottom() {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
    nearBottom.current = true;
    setShowNew(false);
  }

  function loadEarlier() {
    const oldest = sorted[0];
    if (!oldest || earlier.isPending) return;
    earlier.mutate(oldest.id, {
      onSuccess: (res) => {
        const list = listRef.current;
        if (list) prepend.current = { height: list.scrollHeight, top: list.scrollTop };
        setMessages((prev) => merge(prev, res.messages));
        setHasMoreOlder(res.hasMore);
      },
    });
  }

  const trimmed = text.trim();
  function submit() {
    if (!trimmed || send.isPending) return;
    send.mutate(text, {
      onSuccess: () => {
        setText('');
        inputRef.current?.focus();
      },
    });
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter sends, Shift+Enter is a new line. Ignore Enter while an IME is composing.
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    submit();
  }

  const status = latest.error instanceof ApiError ? latest.error.status : 0;
  if (status >= 400 && status < 500) {
    return (
      <section className="chat-card" aria-label="Group chat">
        <h2>Group chat</h2>
        <p className="chat-blocked">You can’t see this chat.</p>
      </section>
    );
  }

  return (
    <section className="chat-card" aria-label="Group chat">
      <h2>Group chat</h2>
      <p className="chat-helper">Only group members can see this chat.</p>
      <div className="chat-log-wrap">
        <div className="chat-log" ref={listRef} onScroll={onScroll} role="log" aria-live="polite" aria-label="Messages">
          {hasMoreOlder && sorted.length > 0 && (
            <button className="chat-earlier" type="button" disabled={earlier.isPending} onClick={loadEarlier}>
              {earlier.isPending ? 'Loading…' : 'Load earlier'}
            </button>
          )}
          {earlier.isError && <p className="chat-note">Could not load earlier messages. Try again.</p>}
          {latest.isLoading && <p className="chat-note">Loading messages…</p>}
          {latest.data && sorted.length === 0 && <p className="chat-empty">No messages yet.</p>}
          {sorted.map((m, i) => {
            const prev = sorted[i - 1];
            const continued = prev && prev.author.id === m.author.id && Date.parse(m.createdAt) - Date.parse(prev.createdAt) < GROUP_WINDOW_MS;
            return (
              <div key={m.id} className={`chat-msg${m.mine ? ' chat-mine' : ''}${continued ? ' chat-continued' : ''}`}>
                {!continued && <span className="chat-author">{m.mine ? 'You' : m.author.name}</span>}
                <p className="chat-body">{m.body}</p>
                <time className="chat-time" dateTime={m.createdAt}>{timeFormat.format(new Date(m.createdAt))}</time>
              </div>
            );
          })}
        </div>
        {showNew && (
          <button className="chat-new" type="button" onClick={scrollToBottom}>New messages ↓</button>
        )}
      </div>
      {latest.isError && <p className="chat-note" role="status">Reconnecting…</p>}
      <form className="chat-composer" onSubmit={(event) => { event.preventDefault(); submit(); }}>
        <label className="sr-only" htmlFor={`chat-input-${groupId}`}>Message</label>
        <textarea
          id={`chat-input-${groupId}`}
          ref={inputRef}
          rows={3}
          maxLength={CHAT_MAX_LENGTH}
          placeholder="Write a message"
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={onKeyDown}
        />
        <div className="chat-actions">
          {text.length >= COUNTER_FROM && <span className="chat-counter">{text.length}/{CHAT_MAX_LENGTH}</span>}
          <button className="button button-small" type="submit" disabled={!trimmed || send.isPending}>
            {send.isPending ? 'Sending…' : 'Send'} <span>↗</span>
          </button>
        </div>
        {send.isError && <p className="form-error" role="alert">{errorText(send.error)}</p>}
      </form>
    </section>
  );
}
