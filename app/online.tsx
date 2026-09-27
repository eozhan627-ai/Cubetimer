import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
import { getSocket } from '../lib/socket';
import { getOrCreateUserId } from '../lib/userId';
import { theme } from '../theme/theme';

type Phase = 'idle' | 'queued' | 'matched' | 'countdown' | 'running' | 'waitingOpponent' | 'finished';

type MatchFoundPayload = { matchId: string; category: string; opponentUserId: string };
type CountdownPayload = { matchId: string; startAt: number };
type MatchResultPayload = { matchId: string; winnerId: string; times: Record<string, number> };

const CATEGORY = '3×3'; // TODO: später von der Kategorie-Auswahl des Home-Screens übernehmen

const formatTime = (ms: number) =>
    `${String(Math.floor(ms / 60000)).padStart(2, '0')}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}.${String(ms % 1000).padStart(3, '0')}`;

export default function OnlineScreen() {
    const [phase, setPhase] = useState<Phase>('idle');
    const [matchId, setMatchId] = useState<string | null>(null);
    const [opponentId, setOpponentId] = useState<string | null>(null);
    const [countdown, setCountdown] = useState(3);
    const [elapsed, setElapsed] = useState(0);
    const [result, setResult] = useState<{ won: boolean; myTime: number; opponentTime: number } | null>(null);
    const [opponentDone, setOpponentDone] = useState(false);
    const [amIReady, setAmIReady] = useState(false);
    const [myFinalTime, setMyFinalTime] = useState<number | null>(null);

    const userIdRef = useRef<string | null>(null);
    const startAtRef = useRef<number | null>(null);
    const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        const socket = getSocket();

        (async () => {
            userIdRef.current = await getOrCreateUserId();
        })();

        socket.on('match:found', ({ matchId, opponentUserId }: MatchFoundPayload) => {
            setMatchId(matchId);
            setOpponentId(opponentUserId);
            setPhase('matched');
        });

        socket.on('match:countdown', ({ startAt }: CountdownPayload) => {
            startAtRef.current = startAt;
            setPhase('countdown');

            countdownRef.current = setInterval(() => {
                const msLeft = startAt - Date.now();
                const secLeft = Math.ceil(msLeft / 1000);

                if (secLeft <= 0) {
                    clearInterval(countdownRef.current!);
                    setPhase('running');
                    tickRef.current = setInterval(() => {
                        setElapsed(Date.now() - startAt);
                    }, 30);
                } else {
                    setCountdown(secLeft);
                }
            }, 100);
        });

        socket.on('match:opponent-stopped', () => setOpponentDone(true));

        socket.on('match:result', ({ winnerId, times }: MatchResultPayload) => {
            if (tickRef.current) clearInterval(tickRef.current);
            const myId = userIdRef.current!;
            const opponent = Object.keys(times).find((id) => id !== myId)!;
            setResult({
                won: winnerId === myId,
                myTime: times[myId],
                opponentTime: times[opponent],
            });
            setPhase('finished');
        });

        return () => {
            socket.off('match:found');
            socket.off('match:countdown');
            socket.off('match:opponent-stopped');
            socket.off('match:result');
            if (tickRef.current) clearInterval(tickRef.current);
            if (countdownRef.current) clearInterval(countdownRef.current);
        };
    }, []);

    const joinQueue = async () => {
        const socket = getSocket();
        const userId = userIdRef.current ?? (await getOrCreateUserId());
        userIdRef.current = userId;
        socket.emit('queue:join', { userId, category: CATEGORY, rating: 1200 });
        setPhase('queued');
    };

    const leaveQueue = () => {
        getSocket().emit('queue:leave');
        setPhase('idle');
    };

    // Phase 1: keine echte Kamera-Prüfung, wir bestätigen direkt "bereit".
    // In Phase 2 kommt hier die echte Kamera-Permission + Preview rein.
    const confirmReady = () => {
        if (!matchId) return;
        setAmIReady(true);
        getSocket().emit('match:camera-ready', { matchId });
    };

    const handleStop = () => {
        if (!matchId) return;
        if (tickRef.current) clearInterval(tickRef.current); // eigenen Timer sofort einfrieren
        setMyFinalTime(elapsed);
        setPhase('waitingOpponent');
        getSocket().emit('match:stop', { matchId });
    };

    const handleReport = () => {
        if (!matchId) return;
        Alert.alert('Gegner melden?', 'Meldung wird an unser Support-Team geschickt.', [
            { text: 'Abbrechen', style: 'cancel' },
            {
                text: 'Melden',
                style: 'destructive',
                onPress: () => getSocket().emit('match:report', { matchId, reason: 'suspected_cheat' }),
            },
        ]);
    };

    const playAgain = () => {
        setResult(null);
        setOpponentDone(false);
        setMatchId(null);
        setOpponentId(null);
        setElapsed(0);
        setCountdown(3);
        setAmIReady(false);
        setMyFinalTime(null);
        setPhase('idle');
    };

    return (
        <View style={styles.container}>
            <Text style={styles.back} onPress={() => router.back()}>← Zurück</Text>
            <Text style={styles.title}>Online spielen – {CATEGORY}</Text>

            {phase === 'idle' && (
                <View style={styles.center}>
                    <Pressable style={styles.primaryButton} onPress={joinQueue}>
                        <Text style={styles.primaryButtonText}>Gegner suchen  </Text>
                    </Pressable>
                </View>
            )}

            {phase === 'queued' && (
                <View style={styles.center}>
                    <Text style={styles.info}>Suche Gegner…  </Text>
                    <Pressable style={styles.secondaryButton} onPress={leaveQueue}>
                        <Text style={styles.secondaryButtonText}>Abbrechen </Text>
                    </Pressable>
                </View>
            )}

            {phase === 'matched' && (
                <View style={styles.center}>
                    <Text style={styles.info}>Gegner gefunden!  </Text>
                    <Text style={styles.subInfo}>
                        Kamera-Check kommt in Phase 2 – für jetzt einfach bestätigen.
                    </Text>
                    {amIReady ? (
                        <Text style={styles.info}>Warte auf Gegner…  </Text>
                    ) : (
                        <Pressable style={styles.primaryButton} onPress={confirmReady}>
                            <Text style={styles.primaryButtonText}>Bereit </Text>
                        </Pressable>
                    )}
                </View>
            )}

            {phase === 'countdown' && (
                <View style={styles.center}>
                    <Text style={styles.countdown}>{countdown} </Text>
                </View>
            )}

            {phase === 'running' && (
                <Pressable style={styles.center} onPress={handleStop}>
                    <Text style={styles.timeText}>{formatTime(elapsed)} </Text>
                    <Text style={styles.subInfo}>Tippen zum Stoppen </Text>
                    {opponentDone && <Text style={styles.warn}>Gegner ist bereits fertig!  </Text>}
                </Pressable>
            )}

            {phase === 'waitingOpponent' && myFinalTime !== null && (
                <View style={styles.center}>
                    <Text style={styles.timeText}>{formatTime(myFinalTime)} </Text>
                    <Text style={styles.subInfo}>Warte auf Gegner…  </Text>
                </View>
            )}

            {phase === 'finished' && result && (
                <View style={styles.center}>
                    <Text style={result.won ? styles.won : styles.lost}>
                        {result.won ? 'Gewonnen! 🎉' : 'Verloren'}
                    </Text>
                    <Text style={styles.info}>Du: {formatTime(result.myTime)} </Text>
                    <Text style={styles.info}>Gegner: {formatTime(result.opponentTime)}  </Text>

                    <View style={styles.row}>
                        <Pressable style={styles.primaryButton} onPress={playAgain}>
                            <Text style={styles.primaryButtonText}>Nochmal  </Text>
                        </Pressable>
                        <Pressable style={styles.reportButton} onPress={handleReport}>
                            <Text style={styles.secondaryButtonText}>Gegner melden  </Text>
                        </Pressable>
                    </View>
                </View>
            )}

            {/* Banner Ad einfügen, wie im Home-Screen */}
            <View style={{ alignItems: 'center' }}>
                <BannerAd
                    unitId={__DEV__ ? TestIds.BANNER : 'ca-app-pub-1563396210958550/3165720661'}
                    size={BannerAdSize.FULL_BANNER}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background, padding: 16 },
    back: { color: '#4da6ff', fontSize: 18, marginBottom: 12, paddingTop: 10 },
    title: { color: '#fff', fontSize: 22, marginBottom: 24 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
    info: { color: '#fff', fontSize: 20 },
    subInfo: { color: '#999', fontSize: 14, textAlign: 'center' },
    warn: { color: '#ff4d4d', fontSize: 16, marginTop: 8 },
    countdown: { color: theme.accent, fontSize: 96, fontWeight: '700' },
    timeText: { color: '#fff', fontSize: 64, fontVariant: ['tabular-nums'] },
    won: { color: '#00ff00', fontSize: 28, fontWeight: '700' },
    lost: { color: '#ff4d4d', fontSize: 28, fontWeight: '700' },
    primaryButton: {
        backgroundColor: theme.accent,
        paddingVertical: 14,
        paddingHorizontal: 28,
        borderRadius: 10,
    },
    primaryButtonText: { color: '#000', fontSize: 18, fontWeight: '600' },
    secondaryButton: { paddingVertical: 10, paddingHorizontal: 20 },
    secondaryButtonText: { color: '#aaa', fontSize: 16 },
    reportButton: {
        backgroundColor: '#3a1a1a',
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 10,
    },
    row: { flexDirection: 'row', gap: 12, marginTop: 12 },
});