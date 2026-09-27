import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'cube-timer-user-id';

function generateId(): string {
    return 'u_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

// Solange es kein Login gibt, bekommt jedes Gerät eine feste zufällige ID,
// die lokal gespeichert wird. Rating/Profil hängen später an dieser ID,
// bis du ein richtiges Auth-System einbaust.
export async function getOrCreateUserId(): Promise<string> {
    let id = await AsyncStorage.getItem(KEY);
    if (!id) {
        id = generateId();
        await AsyncStorage.setItem(KEY, id);
    }
    return id;
}