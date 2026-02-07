import AsyncStorage from '@react-native-async-storage/async-storage';

export type Solve = {
    time: number;
    date: number;
    category: string;
};

const KEY = 'solves';

export async function getSolves(): Promise<Solve[]> {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
}

export async function addSolve(solve: Solve) {
    const solves = await getSolves();
    solves.push(solve);
    await AsyncStorage.setItem(KEY, JSON.stringify(solves));
}

export async function getSolvesByCategory(category: string): Promise<Solve[]> {
    const solves = await getSolves();
    return solves.filter(s => s.category === category);
}