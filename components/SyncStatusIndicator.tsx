import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Cloud, CloudOff, RefreshCw, Check, AlertCircle } from 'lucide-react-native';
import { useSync } from '@/providers/SyncProvider';

export function SyncStatusIndicator() {
  const { syncState, triggerSync, isSyncing } = useSync();
  const spinValue = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (syncState.status === 'syncing') {
      Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      ).start();
    } else {
      spinValue.setValue(0);
    }
  }, [syncState.status, spinValue]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const getStatusIcon = () => {
    switch (syncState.status) {
      case 'syncing':
        return (
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <RefreshCw size={16} color="#fff" />
          </Animated.View>
        );
      case 'success':
        return <Check size={16} color="#fff" />;
      case 'error':
        return <AlertCircle size={16} color="#fff" />;
      default:
        return syncState.error ? <CloudOff size={16} color="#fff" /> : <Cloud size={16} color="#fff" />;
    }
  };

  const getStatusColor = () => {
    switch (syncState.status) {
      case 'syncing':
        return '#3b82f6';
      case 'success':
        return '#10b981';
      case 'error':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const getStatusText = () => {
    switch (syncState.status) {
      case 'syncing':
        return `Synchronisation... ${Math.round(syncState.progress)}%`;
      case 'success':
        return 'Synchronisé';
      case 'error':
        return syncState.error || 'Erreur de synchro';
      default:
        return syncState.lastSync ? 'En ligne' : 'Hors ligne';
    }
  };

  const handlePress = async () => {
    if (!isSyncing) {
      await triggerSync();
    }
  };

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: getStatusColor() }]}
      onPress={handlePress}
      disabled={isSyncing}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>
        {getStatusIcon()}
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.statusText} numberOfLines={1}>
          {getStatusText()}
        </Text>
        {syncState.lastSync && syncState.status !== 'syncing' && (
          <Text style={styles.lastSyncText} numberOfLines={1}>
            {new Date(syncState.lastSync).toLocaleTimeString('fr-FR', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  iconContainer: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flexDirection: 'column',
    gap: 2,
  },
  statusText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  lastSyncText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 10,
    fontWeight: '400',
  },
});
