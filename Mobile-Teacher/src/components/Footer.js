// Footer.js
import React from "react";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";

const Footer = () => {
  const navigation = useNavigation();
  const route = useRoute();

  // Get the parent route name if nested
  const parentRouteName = route.state ? route.state.routes[route.state.index].name : route.name;


  return (
    <View style={styles.bottomNav}>
      <TouchableOpacity
        style={styles.navButton}
        onPress={() => navigation.navigate("Home")}
      >
        <Ionicons
          name="home"
          size={24}
          color={parentRouteName === "HomeSection" ? "#006633" : "#777"} // Highlight active tab
        />
        <Text
          style={[
            styles.navButtonText,
            { color: parentRouteName === "HomeSection" ? "#006633" : "#777" }, // Highlight active tab
          ]}
        >
          Home
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.navButton}
        onPress={() => navigation.navigate("Upload")}
      >
        <Ionicons
          name="school-outline"
          size={24}
          color={parentRouteName === "scheduleSection" ? "#006633" : "#777"} // Highlight active tab
        />
        <Text
          style={[
            styles.navButtonText,
            { color: parentRouteName === "scheduleSection" ? "#006633" : "#777" }, // Highlight active tab
          ]}
        >
          Class & Students
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.navButton}
        onPress={() => navigation.navigate("Profile")}
      >
        <Ionicons
          name="person"
          size={24}
          color={parentRouteName === "Profile" ? "#006633" : "#777"} // Highlight active tab
        />
        <Text
          style={[
            styles.navButtonText,
            { color: parentRouteName === "Profile" ? "#006633" : "#777" }, // Highlight active tab
          ]}
        >
          Profile
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  bottomNav: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 10,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  navButton: {
    alignItems: "center",
  },
  navButtonText: {
    marginTop: 5,
    fontSize: 12,
  },
});

export default Footer;