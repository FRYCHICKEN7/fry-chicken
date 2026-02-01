import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  Image,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { Colors } from '@/constants/colors';
import { Promotion } from '@/types';

const { width } = Dimensions.get('window');
const CAROUSEL_WIDTH = width - 32;

interface PromotionCarouselProps {
  promotions: Promotion[];
  onPress: (promotion: Promotion) => void;
}

export default function PromotionCarousel({
  promotions,
  onPress,
}: PromotionCarouselProps) {
  const scrollRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (promotions.length <= 1) return;

    const interval = setInterval(() => {
      const nextIndex = (activeIndex + 1) % promotions.length;
      scrollRef.current?.scrollTo({
        x: nextIndex * (CAROUSEL_WIDTH + 32), // Ajustado para incluir el margen horizontal
        animated: true,
      });
      setActiveIndex(nextIndex);
    }, 4000);

    return () => clearInterval(interval);
  }, [activeIndex, promotions.length]);

  const handleScroll = (event: any) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / (CAROUSEL_WIDTH + 32));
    setActiveIndex(index);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        decelerationRate="fast"
        snapToInterval={CAROUSEL_WIDTH + 32} // Ajustado al ancho total del slide
        scrollEventThrottle={16}
      >
        {promotions.map((promo) => (
          <TouchableOpacity
            key={promo.id}
            activeOpacity={0.9}
            onPress={() => onPress(promo)}
          >
            <View style={styles.slide}>
              <View style={styles.imageWrapper}>
                <Image 
                  source={{ uri: promo.image }} 
                  style={styles.image} 
                  resizeMode="cover"
                />
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
      
      {promotions.length > 1 && (
        <View style={styles.pagination}>
          {promotions.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === activeIndex && styles.dotActive,
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 15,
  },
  slide: {
    width: CAROUSEL_WIDTH,
    height: 350, 
    borderRadius: 28,
    overflow: 'hidden',
    marginHorizontal: 16,
    backgroundColor: '#1a1a1a', 
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  imageWrapper: {
    width: '100%',
    height: '100%',
    padding: 0, // ELIMINADO: Se quitó el padding de 5 para que la imagen no tenga marco interno
  },
  image: {
    width: '100%',
    height: '100%',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E0E0E0',
  },
  dotActive: {
    backgroundColor: Colors.primary,
    width: 22,
  },
});
