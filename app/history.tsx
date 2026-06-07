import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Dimensions, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring
} from 'react-native-reanimated';
import { deleteSolve, getSolvesByCategory, Solve } from '../lib/solvesStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const formatTime = (ms: number) =>
    `${String(Math.floor(ms / 60000)).padStart(2, '0')}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}.${String(ms % 1000).padStart(3, '0')}`;
const formatDate = (timestamp: number) => {
    const d = new Date(timestamp);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
    })}`;
};

export default function HistoryScreen() {
    const { category } = useLocalSearchParams<{ category: string }>();
    const [solves, setSolves] = useState<Solve[]>([]);
    const [sortMode, setSortMode] = useState<string>('date');
   
    const loadSolves = async () => {
        const data = await getSolvesByCategory(category);
        let sorted = [...data];

        if (sortMode === 'time') {
            sorted.sort((a, b) => a.time - b.time); // beste zuerst
        } else {
            sorted.sort((a, b) => b.date - a.date); // neueste zuerst
        }

        setSolves(sorted);
    };

    useEffect(() => { loadSolves(); }, [category, sortMode]);

    const handleDelete = async (solve: Solve) => {
        const confirmed = await new Promise<boolean>(resolve => {
            Alert.alert('Löschen?', 'Willst du diesen Solve wirklich löschen?', [
                { text: 'Abbrechen', style: 'cancel', onPress: () => resolve(false) },
                { text: 'Löschen', style: 'destructive', onPress: () => resolve(true) }
            ]);
        });
        if (confirmed) {
            await deleteSolve(solve.date);
            loadSolves();
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.back} onPress={() => router.back()}>← Zurück</Text>
            <Text style={styles.title}>{category} – History</Text>
            <View style={styles.segment}>
                <Pressable
                    style={[styles.segmentButton, sortMode === 'time' && styles.segmentActive]}
                    onPress={() => setSortMode('time')}
                >
                    <Text style={styles.segmentText}>Zeit</Text>
                </Pressable>

                <Pressable
                    style={[styles.segmentButton, sortMode === 'date' && styles.segmentActive]}
                    onPress={() => setSortMode('date')}
                >
                    <Text style={styles.segmentText}>Datum</Text>
                </Pressable>
            </View>
            {solves.length === 0 ? (
                <Text style={styles.empty}>Noch keine Solves</Text>
            ) : (
                <View style={{ flex: 1 }}>
                    <FlatList
                        data={solves}
                        keyExtractor={(item) => String(item.date)}
                        renderItem={({ item, index }) => (
                            <SwipeableRow
                                solve={item}
                                total={solves.length}
                                index={index}
                                onDelete={handleDelete}
                                sortMode={sortMode}
                            />
                        )}
                    />
                </View>
            )}

        </View>

    );
}

type RowProps = {
    solve: Solve;
    index: number;
    total: number;
    onDelete: (solve: Solve) => void;
    sortMode: string,
};

function SwipeableRow({ solve, onDelete, index, total, sortMode }: RowProps) {
    const translateX = useSharedValue(0);

    const gesture = Gesture.Pan()
        .activeOffsetX([-20, 20])   // braucht echte horizontale Bewegung
        .failOffsetY([-10, 10])     // bei vertikal -> abbrechen = Scroll übernimmt
        .onUpdate(e => {
            if (e.translationX < 0) translateX.value = e.translationX;
        })
        .onEnd(() => {
            if (translateX.value < -SCREEN_WIDTH * 0.35) {
                runOnJS(onDelete)(solve);
            } else {
                translateX.value = withSpring(0);
            }
        });

    const rStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }],
    }));

    const place = index + 1;

    let medal = null;
    if (place === 1) medal = '🥇';
    else if (place === 2) medal = '🥈';
    else if (place === 3) medal = '🥉';

    return (
        <GestureDetector gesture={gesture}>
            <Animated.View style={[styles.row, rStyle]}>
                <View style={styles.leftBlock}>
                    {sortMode === 'time' && (
                        <Text style={styles.index}>
                            {medal ? medal : `#${place}`}
                        </Text>
                    )}

                    <Text style={styles.time}>{formatTime(solve.time)}</Text>
                </View>

                {sortMode === 'date' && (
                    <Text style={styles.date}>
                        {new Date(solve.date).toLocaleDateString()}
                    </Text>
                )}
            </Animated.View>
        </GestureDetector>

    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000', padding: 16 },
    back: { color: '#4da6ff', fontSize: 18, marginBottom: 12, paddingTop: 10 },
    title: { color: '#fff', fontSize: 24, marginBottom: 12 },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#222',
        backgroundColor: '#111',
        marginBottom: 4,
        height: 60,
    },
    index: { color: '#666' },
    time: { color: '#fff', fontVariant: ['tabular-nums'], fontSize: 18 },
    date: { color: '#777', fontSize: 12, marginTop: 2 },
    empty: { color: '#666', marginTop: 32, textAlign: 'center' },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#222',
        borderRadius: 12,
        padding: 20,
    },
    modalItem: {
        paddingVertical: 12,    
    },
    modalItemText: {
        color: '#fff',
        fontSize: 18,
    },
    closeText: {
        color: '#aaa',
        textAlign: 'center',
        marginTop: 10,
    },
    segment: {
        flexDirection: 'row',
        backgroundColor: '#111',
        borderRadius: 10,
        padding: 4,
        marginBottom: 10,
    },

    segmentButton: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 8,
    },

    segmentActive: {
        backgroundColor: '#4da6ff',
    },

    segmentText: {
        color: '#fff',
        fontWeight: '600',
    },
    leftBlock: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
});