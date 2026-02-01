import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/providers/ThemeProvider';

const { width } = Dimensions.get('window');

interface AddToCartSuccessModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function AddToCartSuccessModal({ visible, onClose }: AddToCartSuccessModalProps) {
  const { colors } = useTheme();
  const router = useRouter();
  
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const emojiScale1 = useRef(new Animated.Value(0)).current;
  const emojiScale2 = useRef(new Animated.Value(0)).current;
  const emojiRotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }),
        Animated.sequence([
          Animated.delay(100),
          Animated.spring(emojiScale1, {
            toValue: 1,
            useNativeDriver: true,
            tension: 100,
            friction: 5,
          }),
        ]),
        Animated.sequence([
          Animated.delay(200),
          Animated.spring(emojiScale2, {
            toValue: 1,
            useNativeDriver: true,
            tension: 100,
            friction: 5,
          }),
        ]),
        Animated.loop(
          Animated.timing(emojiRotate, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          })
        ),
      ]).start();
    } else {
      scaleAnim.setValue(0);
      emojiScale1.setValue(0);
      emojiScale2.setValue(0);
      emojiRotate.setValue(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const rotateInterpolate = emojiRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const handleGoToCart = () => {
    onClose();
    router.push('/cart');
  };

  const handleContinueShopping = () => {
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.content,
            { backgroundColor: colors.surface, transform: [{ scale: scaleAnim }] },
          ]}
        >
          <View style={styles.emojiContainer}>
            <Animated.Text
              style={[
                styles.emoji,
                {
                  transform: [
                    { scale: emojiScale1 },
                    { rotate: rotateInterpolate },
                  ],
                },
              ]}
            >
              🥳
            </Animated.Text>
            <Animated.Text
              style={[
                styles.emoji,
                {
                  transform: [{ scale: emojiScale2 }],
                },
              ]}
            >
              🎉
            </Animated.Text>
          </View>

          <Text style={[styles.title, { color: colors.textPrimary }]}>
            ¡Agregado al Carrito con Éxito!
          </Text>

          <View style={styles.buttonsContainer}>
            <TouchableOpacity
              style={[styles.button, styles.continueButton, { backgroundColor: colors.surface, borderColor: colors.primary }]}
              onPress={handleContinueShopping}
            >
              <Text style={[styles.buttonText, styles.continueButtonText, { color: colors.primary }]}>
                Seguir Comprando
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.cartButton, { backgroundColor: colors.addToCartButton }]}
              onPress={handleGoToCart}
            >
              <Text style={[styles.buttonText, { color: colors.addToCartText }]}>
                Ir a Carrito
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    width: Math.min(width - 40, 400),
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  emojiContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  emoji: {
    fontSize: 64,
  },
  title: {
    fontSize: 22,
    fontWeight: '800' as const,
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 28,
  },
  buttonsContainer: {
    width: '100%',
    gap: 12,
  },
  button: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButton: {
    borderWidth: 2,
  },
  cartButton: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  continueButtonText: {
    fontWeight: '600' as const,
  },
});
