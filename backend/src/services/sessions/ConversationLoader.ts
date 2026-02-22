import fs from 'fs/promises';
import path from 'path';
import { createReadStream } from 'fs';
import readline from 'readline';
import type { ChatMessage, ConversationMessage, ContentBlock } from '../../types';
import { normalizePath, generateProjectSlug } from './PathUtils';

export interface ConversationLoaderDependencies {
  projectsDir: string;
}

/**
 * Loads full conversation from project jsonl file
 */
export class ConversationLoader {
  private projectsDir: string;

  constructor(deps: ConversationLoaderDependencies) {
    this.projectsDir = deps.projectsDir;
  }

  /**
   * Load full conversation from project jsonl file
   */
  async loadFullConversation(sessionId: string, projectPath: string): Promise<ChatMessage[]> {
    const messages: ChatMessage[] = [];

    try {
      // Normalize path and generate project slug from path
      const normalizedPath = normalizePath(projectPath);
      const projectSlug = generateProjectSlug(normalizedPath);
      const conversationFile = path.join(this.projectsDir, projectSlug, `${sessionId}.jsonl`);

      console.log(`[ConversationLoader] Loading conversation for ${sessionId}`);
      console.log(`[ConversationLoader] Project path: ${normalizedPath} -> slug: ${projectSlug}`);
      console.log(`[ConversationLoader] Looking for file: ${conversationFile}`);

      // Check if file exists
      try {
        await fs.access(conversationFile);
        console.log(`[ConversationLoader] File found, parsing...`);
      } catch {
        console.log(`[ConversationLoader] File not found: ${conversationFile}`);
        return messages;
      }

      // Read file line by line
      const fileStream = createReadStream(conversationFile, { encoding: 'utf-8' });
      const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity,
      });

      for await (const line of rl) {
        if (!line.trim()) continue;

        try {
          const entry: ConversationMessage = JSON.parse(line);

          // Only process user and assistant messages
          if (entry.type === 'user' || (entry.type === 'assistant' && entry.message)) {
            const role = entry.type === 'user' ? 'user' : 'assistant';
            const timestamp = new Date(entry.timestamp).getTime();

            if (entry.message?.content) {
              // Handle content as string or array
              if (typeof entry.message.content === 'string') {
                // Simple string content
                if (entry.message.content.trim()) {
                  messages.push({
                    uuid: entry.uuid,
                    role,
                    content: entry.message.content,
                    timestamp,
                    type: 'text',
                  });
                }
              } else if (Array.isArray(entry.message.content)) {
                // Array of content blocks
                for (const content of entry.message.content) {
                  if (content.type === 'text' && content.text) {
                    messages.push({
                      uuid: entry.uuid,
                      role,
                      content: content.text,
                      timestamp,
                      type: 'text',
                    });
                  } else if (content.type === 'thinking' && content.thinking) {
                    messages.push({
                      uuid: entry.uuid,
                      role,
                      content: content.thinking,
                      timestamp,
                      type: 'thinking',
                    });
                  }
                }
              }
            }
          }
        } catch (error) {
          // Skip invalid JSON lines
          continue;
        }
      }

      // Sort messages by timestamp
      messages.sort((a, b) => a.timestamp - b.timestamp);

      console.log(`[ConversationLoader] Loaded ${messages.length} messages for ${sessionId}`);

      return messages;
    } catch (error) {
      console.error(`[ConversationLoader] Error loading conversation for ${sessionId}:`, error);
      return messages;
    }
  }

  /**
   * Load conversation with limit for pagination
   */
  async loadConversationWithLimit(
    sessionId: string,
    projectPath: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<{
    messages: ChatMessage[];
    totalCount: number;
    hasMore: boolean;
  }> {
    const { limit, offset = 0 } = options;

    // Load all messages first (for backward compatibility)
    const allMessages = await this.loadFullConversation(sessionId, projectPath);
    const totalCount = allMessages.length;

    // If limit is specified and total exceeds limit, return only the last 'limit' messages
    let messages = allMessages;
    if (limit !== undefined && limit < totalCount) {
      messages = allMessages.slice(-limit);
      console.log(`[ConversationLoader] Returning last ${messages.length} of ${totalCount} messages for ${sessionId}`);
    } else {
      console.log(`[ConversationLoader] Returning all ${messages.length} messages for ${sessionId}`);
    }

    return {
      messages,
      totalCount,
      hasMore: totalCount > (offset + messages.length),
    };
  }
}
