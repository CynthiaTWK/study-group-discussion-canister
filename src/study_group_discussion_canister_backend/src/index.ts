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

// Methods
export const createGroup = Canister.method(
    [text, text],
    nat,
    (name: text, description: text) => {
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

        return "Successfully joined group";
    });

export const postMessage = Canister.method(
    [nat, text],
    text,
    (groupId: nat, content: text) => {
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
});    return groups;
});

export const getGroupDiscussions = Canister.query(
    [nat],
    Vec(Principal),
    (groupId: nat) => {
        const group = groups.find((group: { id: any; }) => group.id === groupId);
        return group ? group.messages : [];
    }
);

function Vec(StudyGroup: any): any {
    throw new Error('Function not implemented.');
}

