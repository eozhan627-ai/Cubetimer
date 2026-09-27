import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
import { addSolve, deleteSolve, getSolvesByCategory, Solve } from '../lib/solvesStore';
import { theme } from '../theme/theme';

const EMPTY_TIME = '— — : — — . — — —';

export default function HomeScreen() {
    const [time, setTime] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const [lastTime, setLastTime] = useState<number | null>(null);
    const [bestTime, setBestTime] = useState<number | null>(null);
    const [worstTime, setWorstTime] = useState<number | null>(null);
    const [solves, setSolves] = useState<Solve[]>([]);

    const pressTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const startTimeRef = useRef(0);
    const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [lastSolveDate, setLastSolveDate] = useState<number | null>(null);

    const DEFAULT_CATEGORIES = [
        "2×2",
        "2×2 One-Handed",
        "2×2 Blindfolded",

        "3×3",
        "3×3 One-Handed",
        "3×3 Blindfolded",

        "4×4",
        "5×5",
        "6×6",
        "7×7",
        "8×8",
        "9×9",
        "10×10",
        "11×11",
        "12×12",
        "13×13",
        "21×21"
    ];
    const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
    const [category, setCategory] = useState("3×3");
    const [showCategoryModal, setShowCategoryModal] = useState(false);

    // Solves laden
    const loadSolves = async () => {
        const loaded = await getSolvesByCategory(category);
        setSolves(loaded);
        if (loaded.length > 0) {
            const times = loaded.map(s => s.time);
            setBestTime(Math.min(...times));
            setWorstTime(Math.max(...times));
        }
    };

    useEffect(() => { loadSolves(); }, [category]);

    const formatTime = (ms: number) => {
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        const milliseconds = ms % 1000;
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')} `;
    };

    const averageOf = (count: number) => {
        const categorySolves = solves.slice(-count);
        if (categorySolves.length < count) return null;

        const last = categorySolves.map(s => s.time);
        const sorted = [...last].sort((a, b) => a - b);
        const trimmed =
            count === 5 ? sorted.slice(1, 4)
                : count === 10 ? sorted.slice(1, 9)
                    : sorted;
        return Math.round(trimmed.reduce((a, b) => a + b, 0) / trimmed.length);
    };

    const startTimer = () => {
        startTimeRef.current = Date.now();
        intervalRef.current = setInterval(() => setTime(Date.now() - startTimeRef.current), 10);
        setIsRunning(true);
    };

    const stopTimer = async () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        const finalTime = Date.now() - startTimeRef.current;
        setTime(finalTime);
        setLastTime(finalTime);

        const date = Date.now();

        await addSolve({ time: finalTime, date: Date.now(), category });

        setLastSolveDate(date);
        await loadSolves();
        setIsRunning(false);
    };
    const handleDeleteLast = async () => {
        if (!lastSolveDate) return;

        Alert.alert(
            'Solve löschen?',
            'Bist du sicher? Diese Zeit geht verloren.',
            [
                { text: 'Abbrechen', style: 'cancel' },
                {
                    text: 'Löschen',
                    style: 'destructive',
                    onPress: async () => {
                        await deleteSolve(lastSolveDate);
                        setLastSolveDate(null);
                        setTime(0);
                        await loadSolves();
                    },
                },
            ]
        );
    };
    const handlePlusTwo = async () => {
        if (!lastSolveDate) return;

        const list = await getSolvesByCategory(category);
        const solve = list.find(s => s.date === lastSolveDate);
        if (!solve) return;

        await deleteSolve(lastSolveDate);

        const newDate = Date.now();

        await addSolve({
            ...solve,
            time: solve.time + 2000,
            date: newDate,
        });

        setLastSolveDate(newDate);
        await loadSolves();
    };
    const handleDNF = async () => {
        if (!lastSolveDate) return;

        const list = await getSolvesByCategory(category);
        const solve = list.find(s => s.date === lastSolveDate);
        if (!solve) return;

        await deleteSolve(lastSolveDate);

        const newDate = Date.now();

        await addSolve({
            ...solve,
            time: 999999999,
            date: newDate,
        });

        setLastSolveDate(newDate);
        await loadSolves();
    };
    const onPressIn = () => {
        if (isRunning) return;
        pressTimeoutRef.current = setTimeout(() => setIsReady(true), 500);
    };
    const onPressOut = () => {
        if (isRunning) return;
        if (pressTimeoutRef.current) clearTimeout(pressTimeoutRef.current);
        if (isReady) { setIsReady(false); startTimer(); }
    };
    const onPress = () => { if (isRunning) stopTimer(); };
    const backgroundColor = isReady || isRunning
        ? theme.primary
        : theme.background;

    const textColor = theme.text;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerText}>SpeedSolve</Text>
                <View style={styles.headerIcons}>
                    <Pressable onPress={() => router.push('/online')}>
                        <Text style={styles.historyIcon}>🌐</Text>
                    </Pressable>
                    <Pressable onPress={() => router.push({ pathname: '/history', params: { category } })}
                    ><Text style={styles.historyIcon}>⏱</Text></Pressable>
                </View>
            </View>

            <Pressable style={[styles.categoryContainer, { backgroundColor }]} onPress={() => setShowCategoryModal(true)}>
                <Text style={[styles.categoryText, { color: textColor }]}>{category} ▾</Text>
            </Pressable>

            <Pressable style={[styles.timerContainer, { backgroundColor }]} onPressIn={onPressIn} onPressOut={onPressOut} onPress={onPress}>
                {lastSolveDate && !isRunning && (
                    <View style={styles.actionRow}>
                        <Pressable style={styles.actionButton} onPress={handlePlusTwo}>
                            <Text style={styles.actionText}>+2</Text>
                        </Pressable>

                        <Pressable style={styles.actionButton} onPress={handleDNF}>
                            <Text style={styles.actionText}>DNF</Text>
                        </Pressable>

                        <Pressable style={[styles.actionButton, styles.deleteButton]} onPress={handleDeleteLast}>
                            <Text style={styles.actionText}>Löschen</Text>
                        </Pressable>
                    </View>
                )}
                <Text style={[styles.timeText, { color: textColor }]}>{formatTime(time)}</Text>
                <Text style={[styles.hintText, { color: textColor }]}>
                    {isRunning ? 'Tippe um zu stoppen ' : 'Halten und loslassen zum Starten '}
                </Text>
            </Pressable>

            <View style={styles.statsContainer}>
                <View>
                    <Text style={{ color: textColor }}>Letzer: {averageOf(1) ? formatTime(averageOf(1)!) : EMPTY_TIME}</Text>
                    <Text style={{ color: textColor }}>Ø 5: {averageOf(5) ? formatTime(averageOf(5)!) : EMPTY_TIME}</Text>
                    <Text style={{ color: textColor }}>Ø 10: {averageOf(10) ? formatTime(averageOf(10)!) : EMPTY_TIME}</Text>
                    <Text style={{ color: textColor }}>Ø 25: {averageOf(25) ? formatTime(averageOf(25)!) : EMPTY_TIME}</Text>


                </View>
                <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ color: bestTime ? '#00ff00' : '#fff' }}>
                        Best: {bestTime ? formatTime(bestTime) : EMPTY_TIME}
                    </Text>
                    <Text style={{ color: worstTime ? '#ff4d4d' : '#fff' }}>
                        Worst: {worstTime ? formatTime(worstTime) : EMPTY_TIME}
                    </Text>
                    <Text style={{ color: textColor }}>Ø 50: {averageOf(50) ? formatTime(averageOf(50)!) : EMPTY_TIME}</Text>
                    <Text style={{ color: textColor }}>
                        Ø All: {solves.length > 0 ? formatTime(Math.round(solves.reduce((a, b) => a + b.time, 0) / solves.length)) : EMPTY_TIME}
                    </Text>
                </View>
            </View>

            {/* Banner Ad einfügen */}
            <View style={{ alignItems: 'center' }}>
                <BannerAd
                    unitId={__DEV__ ? TestIds.BANNER : 'ca-app-pub-1563396210958550/3165720661'}
                    size={BannerAdSize.FULL_BANNER}
                />
            </View>
            <Modal
                visible={showCategoryModal}
                transparent
                animationType="slide"
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>

                        {/* SCROLLT */}
                        <ScrollView
                            style={{ maxHeight: 350 }}
                            showsVerticalScrollIndicator={false}
                        >
                            {categories.map((c) => (
                                <Pressable
                                    key={c}
                                    style={styles.modalItem}
                                    onPress={() => {
                                        setCategory(c);
                                        setShowCategoryModal(false);
                                    }}
                                >
                                    <Text style={styles.modalItemText}>{c}</Text>
                                </Pressable>
                            ))}
                        </ScrollView>

                        {/* BLEIBT IMMER SICHTBAR */}
                        <View style={{ marginTop: 10 }}>
                            <Pressable
                                style={styles.modalItem}
                                onPress={() => {
                                    setShowAddCategoryModal(true);
                                    setShowCategoryModal(false);
                                }}
                            >
                                <Text style={[styles.modalItemText, { color: '#4da6ff' }]}>
                                    + Neue Kategorie
                                </Text>
                            </Pressable>

                            <Pressable onPress={() => setShowCategoryModal(false)}>
                                <Text style={styles.closeText}>Schließen</Text>
                            </Pressable>
                        </View>

                    </View>
                </View>
            </Modal>
            {/* Add-Category Modal */}
            <Modal visible={showAddCategoryModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={{ color: '#fff', fontSize: 18, marginBottom: 8 }}>Neue Kategorie hinzufügen</Text>
                        <TextInput
                            placeholder="Name der Kategorie"
                            placeholderTextColor="#aaa"
                            value={newCategoryName}
                            onChangeText={setNewCategoryName}
                            style={{
                                color: '#fff',
                                borderBottomWidth: 1,
                                borderBottomColor: '#555',
                                marginBottom: 12,
                                fontSize: 18,
                                paddingVertical: 4
                            }}
                        />
                        <View style={styles.modalButtonsRow}>
                            <Pressable
                                style={styles.cancelButton}
                                onPress={() => setShowAddCategoryModal(false)}
                            >
                                <Text style={styles.cancelButtonText}>Abbrechen</Text>
                            </Pressable>

                            <Pressable
                                style={styles.saveButton}
                                onPress={() => {
                                    if (newCategoryName.trim() === '') return;

                                    setCategories(prev => [newCategoryName.trim(), ...prev]);
                                    setCategory(newCategoryName.trim());
                                    setShowAddCategoryModal(false);
                                    setNewCategoryName('');
                                }}
                            >
                                <Text style={styles.saveButtonText}>Speichern</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    header: { height: 70, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', backgroundColor: theme.header, paddingLeft: 16, paddingTop: 17 },
    headerIcons: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    historyIcon: { fontSize: 30, color: '#fff', marginRight: 14, marginTop: 4 },
    headerText: { color: '#fff', fontSize: 24, fontWeight: '600', marginTop: 4 },
    categoryContainer: { alignItems: 'flex-end', padding: 16 },
    categoryText: { fontSize: 18 },
    timerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    timeText: { fontSize: 72, fontVariant: ['tabular-nums'] },
    statsContainer: { position: 'absolute', bottom: 60, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between' },
    adPlaceholder: { position: 'absolute', bottom: 0, width: '100%', height: 50, justifyContent: 'center', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#222' },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.75)',
        justifyContent: 'center',
        padding: 20,
        paddingTop: 30,
        paddingBottom: 40,
    },
    modalContent: {
        backgroundColor: '#222',
        borderRadius: 12,
        paddingTop: 30,
        paddingBottom: 30,
        paddingHorizontal: 20,
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
        padding: 20,

    },
    modalButtonsRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        marginTop: 16,
    },

    cancelButton: {
        paddingVertical: 12,
        paddingHorizontal: 14,
        marginRight: 10,
    },

    cancelButtonText: {
        color: '#aaa',
        fontSize: 16,
    },

    saveButton: {
        backgroundColor: theme.accent,
        paddingVertical: 12,
        paddingHorizontal: 18,
        borderRadius: 8,
    },

    saveButtonText: {
        color: '#000',
        fontSize: 16,
        fontWeight: '600',
    },
    hintText: {
        marginTop: 12,
        fontSize: 16,
        opacity: 0.8,
    },
    actionRow: {
        flexDirection: 'row',
        marginTop: 20,
        gap: 12,
    },

    actionButton: {
        backgroundColor: theme.surface,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 8,
    },

    deleteButton: {
        backgroundColor: theme.danger,
    },

    actionText: {
        color: theme.text,
        fontSize: 16,
        fontWeight: '600',
    },
});