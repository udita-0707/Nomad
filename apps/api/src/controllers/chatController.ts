import type { Request, Response } from 'express';
import { sql } from 'drizzle-orm';
import {
  CHAT_PAGE_SIZE,
  type ChatMessage,
  type ChatMessageInput,
  type ChatMessageResponse,
  type ChatMessagesResponse,
} from '@nomad/shared';
import { db } from '../db/index.js';
import { assertMember } from '../services/membership.js';

type MessageRow = { id: string | number; author_id: string; author_name: string; body: string; created_at: Date };

// S1: group chat. Only approved members may read or post (assertMember), messages are
// append-only and ordered by id. The author's current name is joined at read time.

// GET /api/groups/:id/messages?before=<id> (member). The newest page below `before`
// (or the newest page), oldest first. Polling calls it without `before`.
export async function listMessages(req: Request, res: Response) {
  const { traveller } = await assertMember(req.params.id, req.user!.id);
  const before = (req.query as { before?: number }).before ?? null;
  // group_id is always in the WHERE, so a `before` from another group can't leak its rows.
  const { rows } = await db.execute<MessageRow>(sql`
    SELECT m.id, m.author_id, t.name AS author_name, m.body, m.created_at
    FROM group_messages m
    JOIN travellers t ON t.id = m.author_id
    WHERE m.group_id = ${req.params.id}
      AND (${before}::bigint IS NULL OR m.id < ${before})
    ORDER BY m.id DESC
    LIMIT ${CHAT_PAGE_SIZE + 1}`);
  const hasMore = rows.length > CHAT_PAGE_SIZE;
  const messages: ChatMessage[] = rows
    .slice(0, CHAT_PAGE_SIZE)
    .reverse()
    .map((r) => ({
      id: Number(r.id),
      author: { id: r.author_id, name: r.author_name },
      body: r.body,
      createdAt: new Date(r.created_at).toISOString(),
      mine: r.author_id === traveller.id,
    }));
  const body: ChatMessagesResponse = { messages, hasMore };
  res.json(body);
}

// POST /api/groups/:id/messages (member). Works before and after the group books.
export async function postMessage(req: Request, res: Response) {
  const { traveller, group } = await assertMember(req.params.id, req.user!.id);
  const { body: text } = req.body as ChatMessageInput;
  const { rows } = await db.execute<{ id: string | number; created_at: Date }>(sql`
    INSERT INTO group_messages (group_id, author_id, body)
    VALUES (${group.id}, ${traveller.id}, ${text})
    RETURNING id, created_at`);
  const body: ChatMessageResponse = {
    message: {
      id: Number(rows[0].id),
      author: { id: traveller.id, name: traveller.name },
      body: text,
      createdAt: new Date(rows[0].created_at).toISOString(),
      mine: true,
    },
  };
  res.status(201).json(body);
}
