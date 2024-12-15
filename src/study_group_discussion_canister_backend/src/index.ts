import { Canister, ic, nat, Principal, stable, text } from 'azle';

// Types
type GroupId = nat;
type Timestamp = nat;

interface Message {
    sender: Principal;
    content: text;
    timestamp: Timestamp;
}

interface StudyGroup {
    id: GroupId;
    name: text;
    description: text;
    creator: Principal;
    members: Principal[];
    messages: Message[];
}

// State
let groups: stable<StudyGroup[]> = [];
let nextGroupId: stable<GroupId> = 1;

// Constants
const MAX_GROUP_MEMBERS = 100;
const MAX_MESSAGE_LENGTH = 1000;
const MIN_GROUP_NAME_LENGTH = 3;
const MAX_GROUP_NAME_LENGTH = 50;

// Helper Functions
function getCurrentTimestamp(): Timestamp {
    return ic.time() / BigInt(1_000_000); // Converts to milliseconds
}

function getGroupById(groupId: GroupId): StudyGroup | null {
    return groups.find((group: StudyGroup) => group.id === groupId) || null;
}

function validateGroupName(name: text): void {
    const trimmedName = name.trim();
    if (!trimmedName) {
        throw new Error("Group name is required");
    }
    if (trimmedName.length < MIN_GROUP_NAME_LENGTH || trimmedName.length > MAX_GROUP_NAME_LENGTH) {
        throw new Error(`Group name must be between ${MIN_GROUP_NAME_LENGTH} and ${MAX_GROUP_NAME_LENGTH} characters`);
    }
}

function validateMessageContent(content: text): text {
    const trimmedContent = content.trim();
    if (!trimmedContent) {
        throw new Error("Message content cannot be empty");
    }
    if (trimmedContent.length > MAX_MESSAGE_LENGTH) {
        throw new Error(`Message content cannot exceed ${MAX_MESSAGE_LENGTH} characters`);
    }
    return trimmedContent;
}

// Methods
export const createGroup = Canister.method(
    [text, text],
    nat,
    (name: text, description: text) => {
        validateGroupName(name);

        if (!description.trim()) {
            throw new Error("Description is required");
        }

        const caller = ic.caller();
        const newGroup: StudyGroup = {
            id: nextGroupId,
            name: name.trim(),
            description: description.trim(),
            creator: caller,
            members: [caller],
            messages: []
        };

        groups.push(newGroup);
        return nextGroupId++;
    }
);

export const joinGroup = Canister.method(
    [nat],
    text,
    (groupId: GroupId) => {
        const caller = ic.caller();
        const group = getGroupById(groupId);

        if (!group) {
            throw new Error("Group not found");
        }

        if (group.members.length >= MAX_GROUP_MEMBERS) {
            throw new Error("Group has reached maximum capacity");
        }

        if (!group.members.includes(caller)) {
            group.members.push(caller);
            return "Successfully joined the group";
        }

        return "You are already a member of this group";
    }
);

export const postMessage = Canister.method(
    [nat, text],
    text,
    (groupId: GroupId, content: text) => {
        const caller = ic.caller();
        const group = getGroupById(groupId);

        if (!group) {
            throw new Error("Group not found");
        }

        if (!group.members.includes(caller)) {
            throw new Error("You are not a member of this group");
        }

        const validatedContent = validateMessageContent(content);

        const message: Message = {
            sender: caller,
            content: validatedContent,
            timestamp: getCurrentTimestamp()
        };

        group.messages.push(message);
        return "Message posted successfully";
    }
);

export const listGroups = Canister.query([], stable<StudyGroup[]>(), () => {
    return groups;
});

export const getGroupDiscussions = Canister.query(
    [nat, nat, nat],
    stable<Message[]>(),
    (groupId: GroupId, skip: nat, limit: nat) => {
        const group = getGroupById(groupId);

        if (!group) {
            throw new Error("Group not found");
        }

        const startIndex = Number(skip);
        const endIndex = startIndex + Number(limit);

        if (startIndex >= group.messages.length) {
            return []; // No messages to display
        }

        return group.messages.slice(startIndex, Math.min(endIndex, group.messages.length));
    }
);
