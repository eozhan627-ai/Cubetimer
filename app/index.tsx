import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { addSolve, getSolvesByCategory, Solve } from '../lib/solvesStore';

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

    const DEFAULT_CATEGORIES = [
        "3×3", "3×3 One-Handed", "3×3 Blindfolded", "4×4", "5×5", "6×6",
        "7×7", "8×8", "9×9", "10×10", "11×11", "12×12", "13×13", "21×21"
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
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
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

        await addSolve({ time: finalTime, date: Date.now(), category });
        await loadSolves();
        setIsRunning(false);
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

    const backgroundColor = isReady || isRunning ? '#257358' : '#671c2b';
    const textColor = backgroundColor === '#257358' ? '#fff' : '#000';

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerText}>SpeedSolve</Text>
                <Pressable onPress={() => router.push('/history')}><Text style={styles.historyIcon}>⏱</Text></Pressable>
            </View>

            <Pressable style={[styles.categoryContainer, { backgroundColor }]} onPress={() => setShowCategoryModal(true)}>
                <Text style={[styles.categoryText, { color: textColor }]}>{category} ▾</Text>
            </Pressable>

            <Pressable style={[styles.timerContainer, { backgroundColor }]} onPressIn={onPressIn} onPressOut={onPressOut} onPress={onPress}>
                <Text style={[styles.timeText, { color: textColor }]}>{formatTime(time)}</Text>
            </Pressable>

            <View style={styles.statsContainer}>
                <View>
                    <Text style={{ color: textColor }}>Ø 5: {averageOf(5) ? formatTime(averageOf(5)!) : EMPTY_TIME}</Text>
                    <Text style={{ color: textColor }}>Ø 10: {averageOf(10) ? formatTime(averageOf(10)!) : EMPTY_TIME}</Text>
                </View>
                <View>
                    <Text style={{ color: textColor }}>Best: {bestTime ? formatTime(bestTime) : EMPTY_TIME}</Text>
                    <Text style={{ color: textColor }}>Worst: {worstTime ? formatTime(worstTime) : EMPTY_TIME}</Text>
                </View>
            </View>

            <View style={styles.adPlaceholder}>
                <BannerAd
                    unitId="ca-app-pub-1563396210958550/3165720661"
                    size={BannerAdSize.FULL_BANNER}
                    requestOptions={{ requestNonPersonalizedAdsOnly: false }}
                    onAdFailedToLoad={(err) => console.log('Ad failed: ', err)}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    header: { height: 60, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', backgroundColor: '#444', paddingLeft: 16, paddingTop: 17 },
    historyIcon: { fontSize: 22, color: '#fff', marginRight: 20 },
    headerText: { color: '#fff', fontSize: 24, fontWeight: '600' },
    categoryContainer: { alignItems: 'flex-end', padding: 16 },
    categoryText: { fontSize: 18 },
    timerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    timeText: { fontSize: 72, fontVariant: ['tabular-nums'] },
    statsContainer: { position: 'absolute', bottom: 60, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between' },
    adPlaceholder: { position: 'absolute', bottom: 0, width: '100%', height: 50, justifyContent: 'center', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#222' },
});