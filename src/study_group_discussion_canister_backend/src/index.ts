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

// Helper Functions
function getCurrentTimestamp(): Timestamp {
    return ic.time() / BigInt(1_000_000);
}

function getGroupById(groupId: nat): StudyGroup | undefined {
    return groups.find((group: StudyGroup) => group.id === groupId);
}

// Methods
export const createGroup = Canister.method(
    [text, text],
    nat,
    (name: text, description: text) => {
        if (!name || !description) {
            throw new Error("Name and description are required");
        }
        if (name.length < 3 || name.length > 50) {
            throw new Error("Name must be between 3 and 50 characters");
        }
        const caller = ic.caller();
        const newGroup: StudyGroup = {
            id: nextGroupId,
            name,
            description,
            creator: caller,
            members: [caller],
            messages: []
        };

        groups.push(newGroup);
        return nextGroupId++;
    });

const MAX_GROUP_MEMBERS = 100;

export const joinGroup = Canister.method(
    [nat],
    text,
    (groupId: nat) => {
        const caller = ic.caller();
        const group = groups.find((group: StudyGroup) => group.id === groupId);

        if (!group) {
            return "Group not found";
        }

        if (!group.members.includes(caller)) {
            group.members.push(caller);
        }

        if (group.members.length >= MAX_GROUP_MEMBERS) {
            return "Group has reached maximum capacity";
        }

        return "Successfully joined group";
    });

export const postMessage = Canister.method(
    [nat, text],
    text,
    (groupId: nat, content: text) => {
        if (!content || content.trim().length === 0) {
            return "Message content cannot be empty";
        }
        if (content.length > 1000) {
            return "Message content too long";
        }
        const caller = ic.caller();
        const group = groups.find((group: StudyGroup) => group.id === groupId);

        if (!group) {
            return "Group not found";
        }

        if (!group.members.includes(caller)) {
            return "You are not a member of this group";
        }

        const message: Message = {
            sender: caller,
            content,
            timestamp: getCurrentTimestamp()
        };

        group.messages.push(message);
        return "Message posted successfully";
    }
);

export const listGroups = Canister.query([], Vec(StudyGroup), () => {
    return groups;
});

export const getGroupDiscussions = Canister.query(
    [nat, nat, nat],
    Vec(Message),
    (groupId: nat, skip: nat, limit: nat) => {
        const group = groups.find((group: StudyGroup) => group.id === groupId);
        if (!group) return [];
        return group.messages.slice(Number(skip), Number(skip) + Number(limit));
    }
);

function Vec(StudyGroup: any): any {
    throw new Error('Function not implemented.');
}

