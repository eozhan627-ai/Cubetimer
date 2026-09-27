import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'cube-timer-solves';

export type Solve = {
    time: number;     // Zeit in ms
    date: number;     // Zeitstempel (Date.now()), dient auch als eindeutige ID
    category: string;
};

async function readAll(): Promise<Solve[]> {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    try {
        return JSON.parse(raw) as Solve[];
    } catch {
        return [];
    }
}

async function writeAll(solves: Solve[]): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(solves));
}

export async function addSolve(solve: Solve): Promise<void> {
    const all = await readAll();
    all.push(solve);
    await writeAll(all);
}

export async function deleteSolve(date: number): Promise<void> {
    const all = await readAll();
    await writeAll(all.filter((s) => s.date !== date));
}

export async function getSolvesByCategory(category: string): Promise<Solve[]> {
    const all = await readAll();
    return all.filter((s) => s.category === category);
}