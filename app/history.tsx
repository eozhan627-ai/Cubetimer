import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getSolvesByCategory, Solve } from '../lib/solvesStore';

const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const milliseconds = ms % 1000;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
};

export default function HistoryScreen() {
    const category = '3×3';
    const [solves, setSolves] = useState<Solve[]>([]);

    const loadSolves = async () => {
        const data = await getSolvesByCategory(category);
        setSolves(data.reverse());
    };

    useEffect(() => { loadSolves(); }, []);

    return (
        <ScrollView style={styles.container}>
            <Pressable onPress={() => router.back()}><Text style={styles.back}>← Zurück</Text></Pressable>
            <Text style={styles.title}>{category} – History</Text>

            {solves.length === 0 ? (
                <Text style={styles.empty}>Noch keine Solves</Text>
            ) : (
                solves.map((solve, index) => (
                    <View key={index} style={styles.row}>
                        <Text style={styles.index}>#{solves.length - index}</Text>
                        <Text style={styles.time}>{formatTime(solve.time)}</Text>
                    </View>
                ))
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000', padding: 16 },
    back: { color: '#4da6ff', fontSize: 18, marginBottom: 12 },
    title: { color: '#fff', fontSize: 24, marginBottom: 12 },
    row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#222' },
    index: { color: '#666' },
    time: { color: '#fff', fontVariant: ['tabular-nums'] },
    empty: { color: '#666', marginTop: 32, textAlign: 'center' },
});