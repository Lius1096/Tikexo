import React, { ReactNode } from 'react';
import { View, ScrollView, StyleSheet, ViewStyle, RefreshControlProps } from 'react-native';
import { colors } from '../tokens';

interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
  refreshControl?: React.ReactElement<RefreshControlProps>;
}

export function Screen({ children, scroll, style, contentContainerStyle, refreshControl }: ScreenProps) {
  if (scroll) {
    return (
      <ScrollView
        style={[styles.container, style]}
        contentContainerStyle={contentContainerStyle}
        refreshControl={refreshControl}
      >
        {children}
      </ScrollView>
    );
  }
  return <View style={[styles.container, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.lightGray },
});
