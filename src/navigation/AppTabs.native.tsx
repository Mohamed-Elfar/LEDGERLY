import {
  BottomTabBarProps,
  createBottomTabNavigator,
} from "@react-navigation/bottom-tabs";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CustomersStackNavigator } from "./CustomersStack";
import { ProfileScreen } from "../screens/ProfileScreen";
import { TeamScreen } from "../screens/TeamScreen";
import { HistoryScreen } from "../screens/HistoryScreen";
import { UserProfile } from "../types/models";

const Tab = createBottomTabNavigator();
const { width } = Dimensions.get("window");
const TAB_HEIGHT = 78;
const CORNER_RADIUS = 18;
const CUTOUT_RADIUS = 34;
const TAB_PADDING = 18;

type Props = {
  profile: UserProfile;
  profileLoading: boolean;
  signingOut: boolean;
  loadProfile: () => Promise<void>;
  handleSignOut: () => Promise<void>;
};

export function AppTabNavigator({
  profile,
  profileLoading,
  signingOut,
  loadProfile,
  handleSignOut,
}: Props) {
  return (
    <Tab.Navigator
      tabBar={(props) => <CurvedTabBar {...props} />}
      screenOptions={{
        headerShown: true,
        headerTitleAlign: "center",
        headerStyle: {
          backgroundColor: "transparent",
          borderBottomWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTitleStyle: { color: "#f2f6fc", fontWeight: "700" },
        headerTintColor: "#9fc5ff",
        headerBackground: () => (
          <View style={styles.headerBackground}>
            <View style={styles.headerFill} />
          </View>
        ),
      }}
    >
      <Tab.Screen
        name="CustomersTab"
        component={CustomersStackNavigator}
        initialParams={{ profile }}
        options={{
          title: profile.org_name || "Organization",
          tabBarLabel: "Customers",
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons
              name={focused ? "home" : "home-outline"}
              size={focused ? 28 : 24}
              color={color}
            />
          ),
          headerShown: false,
        }}
      />

      <Tab.Screen
        name="ProfileTab"
        options={{
          title: profile.org_name || "Organization",
          tabBarLabel: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons
              name={focused ? "account" : "account-outline"}
              size={focused ? 28 : 24}
              color={color}
            />
          ),
        }}
      >
        {() => (
          <ProfileScreen
            profile={profile}
            refreshing={profileLoading}
            signingOut={signingOut}
            onRefresh={loadProfile}
            onSignOut={handleSignOut}
          />
        )}
      </Tab.Screen>

      {profile.role === "ADMIN" && (
        <Tab.Screen
          name="TeamTab"
          options={{
            title: profile.org_name || "Organization",
            tabBarLabel: "Team",
            tabBarIcon: ({ color, focused }) => (
              <MaterialCommunityIcons
                name={focused ? "account-tie" : "account-tie"}
                size={focused ? 28 : 24}
                color={color}
              />
            ),
          }}
        >
          {() => <TeamScreen profile={profile} />}
        </Tab.Screen>
      )}

      {profile.role === "ADMIN" && (
        <Tab.Screen
          name="HistoryTab"
          options={{
            title: profile.org_name || "Organization",
            tabBarLabel: "History",
            tabBarIcon: ({ color, focused }) => (
              <MaterialCommunityIcons
                name={focused ? "history" : "history"}
                size={focused ? 28 : 24}
                color={color}
              />
            ),
          }}
        >
          {() => <HistoryScreen profile={profile} />}
        </Tab.Screen>
      )}
    </Tab.Navigator>
  );
}

function getCutoutCenter({
  routesCount,
  activeIndex,
}: {
  routesCount: number;
  activeIndex: number;
}) {
  const tabWidth = (width - TAB_PADDING * 2) / routesCount;
  const unclampedCenter = TAB_PADDING + tabWidth * activeIndex + tabWidth / 2;
  const min = CORNER_RADIUS + CUTOUT_RADIUS;
  const max = width - (CORNER_RADIUS + CUTOUT_RADIUS);
  return Math.min(Math.max(unclampedCenter, min), max);
}

function CurvedBackground({ cutoutCenter }: { cutoutCenter: number }) {
  const leftX = cutoutCenter - CUTOUT_RADIUS;
  const rightX = cutoutCenter + CUTOUT_RADIUS;

  const d = `
    M0,${TAB_HEIGHT}
    L0,${CORNER_RADIUS} Q0,0 ${CORNER_RADIUS},0
    L${leftX},0
    A${CUTOUT_RADIUS},${CUTOUT_RADIUS} 0 0 0 ${rightX},0
    L${width - CORNER_RADIUS},0 Q${width},0 ${width},${CORNER_RADIUS}
    L${width},${TAB_HEIGHT}
    Z
  `;

  return (
    <Svg
      width={width}
      height={TAB_HEIGHT + 12}
      viewBox={`0 0 ${width} ${TAB_HEIGHT + 12}`}
      style={StyleSheet.absoluteFill}
    >
      <Path d={d} fill="#0f2a40" stroke="#1c3a52" strokeWidth={1} />
    </Svg>
  );
}

function CurvedTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const cutoutCenter = getCutoutCenter({
    routesCount: state.routes.length,
    activeIndex: state.index,
  });

  return (
    <View style={[styles.tabWrapper, { paddingBottom: insets.bottom }]}>
      <CurvedBackground cutoutCenter={cutoutCenter} />
      <View style={styles.tabRow}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label =
            typeof options.tabBarLabel === "string"
              ? options.tabBarLabel
              : options.title ?? route.name;
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: "tabLongPress",
              target: route.key,
            });
          };

          const color = isFocused ? "#e8f2ff" : "#7da6d8";
          const icon = options.tabBarIcon
            ? options.tabBarIcon({
                focused: isFocused,
                color,
                size: isFocused ? 32 : 24,
              })
            : null;

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              testID={options.tabBarTestID}
              onPress={onPress}
              onLongPress={onLongPress}
              activeOpacity={0.82}
              style={styles.tabItem}
            >
              {isFocused && <View style={styles.activeCurve} />}
              <View
                style={[styles.iconWrap, isFocused && styles.iconWrapActive]}
              >
                {icon}
              </View>
              <Text
                style={[
                  styles.tabLabel,
                  isFocused ? styles.labelActive : styles.labelInactive,
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabWrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: TAB_HEIGHT,
    backgroundColor: "transparent",
  },
  tabRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: TAB_PADDING,
    height: TAB_HEIGHT,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 12,
    gap: 6,
    position: "relative",
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: "700",
  },
  labelActive: {
    color: "#e8f2ff",
  },
  labelInactive: {
    color: "#7da6d8",
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapActive: {
    backgroundColor: "#2d8cff",
    shadowColor: "#000000",
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
    width: 48,
    height: 48,
    borderRadius: 24,
    marginBottom: 20,
  },
  activeCurve: {
    position: "absolute",
    bottom: -6,
    width: 36,
    height: 6,
    backgroundColor: "#2d8cff",
    borderRadius: 4,
  },
  headerBackground: {
    flex: 1,
    backgroundColor: "transparent",
  },
  headerFill: {
    flex: 1,
    backgroundColor: "#0f2a40",
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    borderBottomWidth: 1,
    borderColor: "#1c3a52",
  },
});
