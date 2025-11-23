import React from 'react';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInUp,
  SlideOutDown,
  SlideInDown,
  SlideOutUp,
  withSpring,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Pressable, PressableProps } from 'react-native';

// Fade In Component
export function FadeInView({
  children,
  delay = 0,
  duration = 300,
  ...props
}: {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
} & Animated.AnimatedProps<any>) {
  return (
    <Animated.View
      entering={FadeIn.delay(delay).duration(duration)}
      exiting={FadeOut.duration(duration)}
      {...props}
    >
      {children}
    </Animated.View>
  );
}

// Slide Up Component
export function SlideUpView({
  children,
  delay = 0,
  duration = 300,
  ...props
}: {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
} & Animated.AnimatedProps<any>) {
  return (
    <Animated.View
      entering={SlideInUp.delay(delay).duration(duration).springify()}
      exiting={SlideOutDown.duration(duration)}
      {...props}
    >
      {children}
    </Animated.View>
  );
}

// Slide Down Component
export function SlideDownView({
  children,
  delay = 0,
  duration = 300,
  ...props
}: {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
} & Animated.AnimatedProps<any>) {
  return (
    <Animated.View
      entering={SlideInDown.delay(delay).duration(duration).springify()}
      exiting={SlideOutUp.duration(duration)}
      {...props}
    >
      {children}
    </Animated.View>
  );
}

// Pressable with Scale Animation
export function PressableScale({
  children,
  onPress,
  scale = 0.95,
  ...props
}: {
  children: React.ReactNode;
  onPress?: () => void;
  scale?: number;
} & PressableProps) {
  const scaleValue = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleValue.value }],
  }));

  const handlePressIn = () => {
    scaleValue.value = withSpring(scale, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scaleValue.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      {...props}
    >
      <Animated.View style={animatedStyle}>{children}</Animated.View>
    </Pressable>
  );
}

// Stagger Container for lists
export function StaggerContainer({
  children,
  delay = 50,
}: {
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      style={{ gap: delay }}
    >
      {React.Children.map(children, (child, index) => (
        <Animated.View
          key={index}
          entering={FadeIn.delay(index * delay).duration(300)}
        >
          {child}
        </Animated.View>
      ))}
    </Animated.View>
  );
}
