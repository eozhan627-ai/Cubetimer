// components/AdBanner.tsx
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';

type Props = {
    adUnitId?: string; // Optional: falls du dynamisch wechseln willst
};

export default function AdBanner({ adUnitId }: Props) {
    const bannerUnitId = adUnitId || TestIds.BANNER; // TestId nutzen, falls noch keine echte ID eingetragen

    return (
        <View style={styles.container}>
            <BannerAd
                unitId={bannerUnitId}
                size={BannerAdSize.FULL_BANNER}
                requestOptions={{
                    requestNonPersonalizedAdsOnly: true,
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        marginVertical: 10,
    },
});