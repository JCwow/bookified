import { NextResponse } from "next/server";
import { searchBookSegments } from "@/lib/actions/book.actions";

const NO_INFO_RESULT = "no information found about this topic.";

type ParsedToolCall = {
    bookId: string;
    query: string;
    segmentNumber: number;
};

const SERVICE_TOKEN_ENV_KEYS = ["VAPI_WEBHOOK_SERVICE_TOKEN", "VAPI_WEBHOOK_API_KEY"] as const;
const USER_ID_KEYS = new Set(["userId", "user_id", "clerkId", "clerk_id"]);

const normalizeToolName = (name: string) =>
    name
        .toLowerCase()
        .replace(/[_-]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

const parseJsonObject = (value: unknown): Record<string, unknown> | null => {
    if (typeof value === "object" && value !== null) {
        return value as Record<string, unknown>;
    }

    if (typeof value !== "string") {
        return null;
    }

    try {
        const parsed = JSON.parse(value) as unknown;
        if (typeof parsed === "object" && parsed !== null) {
            return parsed as Record<string, unknown>;
        }
    } catch {
        return null;
    }

    return null;
};

const getFirstString = (params: Record<string, unknown>, keys: string[]) => {
    for (const key of keys) {
        const value = params[key];
        if (typeof value === "string" && value.trim()) {
            return value.trim();
        }
    }
    return null;
};

const getFirstNumber = (params: Record<string, unknown>, keys: string[], fallback: number) => {
    for (const key of keys) {
        const value = params[key];
        if (typeof value === "number" && Number.isFinite(value)) {
            return value;
        }
        if (typeof value === "string" && value.trim()) {
            const parsed = Number(value);
            if (Number.isFinite(parsed)) {
                return parsed;
            }
        }
    }
    return fallback;
};

const parseToolCalls = (body: Record<string, unknown>): ParsedToolCall[] => {
    const toolCallsRaw =
        (body.message as { toolCalls?: unknown[] } | undefined)?.toolCalls ??
        (body as { toolCalls?: unknown[] }).toolCalls;

    if (!Array.isArray(toolCallsRaw)) {
        return [];
    }

    const parsedCalls: ParsedToolCall[] = [];

    for (const toolCall of toolCallsRaw) {
        if (typeof toolCall !== "object" || toolCall === null) {
            continue;
        }

        const callRecord = toolCall as Record<string, unknown>;
        const functionRecord =
            typeof callRecord.function === "object" && callRecord.function !== null
                ? (callRecord.function as Record<string, unknown>)
                : null;

        const name =
            (typeof functionRecord?.name === "string" && functionRecord.name) ||
            (typeof callRecord.name === "string" && callRecord.name);

        if (!name || normalizeToolName(name) !== "search book") {
            continue;
        }

        const params =
            parseJsonObject(functionRecord?.arguments) ??
            parseJsonObject(callRecord.parameters) ??
            parseJsonObject(callRecord.arguments) ??
            parseJsonObject(callRecord.args);

        if (!params) {
            continue;
        }

        const bookId = getFirstString(params, ["bookId", "book_id", "id"]);
        const query = getFirstString(params, ["query", "searchQuery", "search_query", "q"]);
        const segmentNumber = getFirstNumber(
            params,
            ["segmentNumber", "segment_number", "numberOfSegments", "segmentCount", "segments"],
            3,
        );

        if (!bookId || !query) {
            continue;
        }

        parsedCalls.push({ bookId, query, segmentNumber });
    }

    return parsedCalls;
};

const getConfiguredServiceToken = () => {
    for (const key of SERVICE_TOKEN_ENV_KEYS) {
        const value = process.env[key];
        if (typeof value === "string" && value.trim()) {
            return value.trim();
        }
    }
    return null;
};

const extractServiceToken = (request: Request) => {
    const apiKey = request.headers.get("x-api-key");
    if (typeof apiKey === "string" && apiKey.trim()) {
        return apiKey.trim();
    }

    const authorization = request.headers.get("authorization");
    if (!authorization) {
        return null;
    }

    const [scheme, token] = authorization.trim().split(/\s+/, 2);
    if (!scheme || !token || scheme.toLowerCase() !== "bearer") {
        return null;
    }

    return token.trim();
};

const isServiceTokenValid = (token: string | null) => {
    const configuredServiceToken = getConfiguredServiceToken();
    if (!configuredServiceToken || !token) {
        return false;
    }
    return token === configuredServiceToken;
};

const extractUserIdFromPayload = (value: unknown, depth = 0): string | null => {
    if (depth > 4 || typeof value !== "object" || value === null) {
        return null;
    }

    if (Array.isArray(value)) {
        for (const item of value) {
            const userId = extractUserIdFromPayload(item, depth + 1);
            if (userId) {
                return userId;
            }
        }
        return null;
    }

    for (const [key, fieldValue] of Object.entries(value)) {
        if (USER_ID_KEYS.has(key) && typeof fieldValue === "string" && fieldValue.trim()) {
            return fieldValue.trim();
        }
    }

    for (const fieldValue of Object.values(value)) {
        const userId = extractUserIdFromPayload(fieldValue, depth + 1);
        if (userId) {
            return userId;
        }
    }

    return null;
};

export async function POST(request: Request): Promise<NextResponse> {
    try {
        const body = (await request.json()) as Record<string, unknown>;
        const parsedCalls = parseToolCalls(body);
        const payloadUserId = extractUserIdFromPayload(body);
        const incomingServiceToken = extractServiceToken(request);
        const configuredServiceToken = getConfiguredServiceToken();
        const validatedServiceToken = isServiceTokenValid(incomingServiceToken)
            ? incomingServiceToken
            : null;

        if (parsedCalls.length === 0) {
            return NextResponse.json({ result: NO_INFO_RESULT });
        }

        if (configuredServiceToken && !validatedServiceToken) {
            return NextResponse.json({ result: NO_INFO_RESULT }, { status: 401 });
        }

        if (!payloadUserId && !validatedServiceToken) {
            return NextResponse.json({ result: NO_INFO_RESULT }, { status: 401 });
        }

        const formattedMatches: string[] = [];
        for (const parsedCall of parsedCalls) {
            const searchResult = await searchBookSegments(
                parsedCall.bookId,
                parsedCall.query,
                parsedCall.segmentNumber,
                {
                    userId: payloadUserId,
                    serviceToken: validatedServiceToken,
                },
            );

            if (!searchResult.success || !Array.isArray(searchResult.data) || searchResult.data.length === 0) {
                continue;
            }

            const callMatches = searchResult.data
                .slice(0, 3)
                .map((segment) => {
                    const segmentIndex = (segment as { segmentIndex?: number }).segmentIndex;
                    const pageNumber = (segment as { pageNumber?: number }).pageNumber;
                    const content = (segment as { content?: string }).content?.trim() ?? "";

                    const indexLabel =
                        typeof segmentIndex === "number" ? `Segment ${segmentIndex}` : "Segment";
                    const pageLabel = typeof pageNumber === "number" ? ` (Page ${pageNumber})` : "";

                    return `${indexLabel}${pageLabel}\n${content}`;
                })
                .filter(Boolean);

            formattedMatches.push(...callMatches);
        }

        const result = formattedMatches.join("\n\n");

        return NextResponse.json({ result: result || NO_INFO_RESULT });
    } catch (e) {
        console.error("Error handling Vapi search-book tool call", e);
        return NextResponse.json({ result: NO_INFO_RESULT }, { status: 500 });
    }
}
