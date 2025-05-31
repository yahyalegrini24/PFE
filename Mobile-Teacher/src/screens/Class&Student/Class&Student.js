import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Footer from '../../components/Footer';

const UploadPage = ({ navigation }) => {
  const handleModifyTimetable = () => {
    navigation.navigate("TimeTable");
  }; 

  const handleUploadStudentsList = () => {
    navigation.navigate("UploadLists");
  };

  const handleExportStudentsList = () => {
   navigation.navigate("ExportPage");
  };

  
  const handleAddEditSession =()=>{
   navigation.navigate("EditSession");
  }

  const ActionCard = ({ title, icon, onPress }) => (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <MaterialCommunityIcons name={icon} size={32} color="#006633" />
      <Text style={styles.cardText}>{title}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.header}> Class & Students</Text>
        <View style={styles.cardContainer}>
          <ActionCard
            title="Timetable"
            icon="timetable"
            onPress={handleModifyTimetable}
          />
          <ActionCard
            title="Choose Students Lists"
            icon="file-upload"
            onPress={handleUploadStudentsList}
          />
          <ActionCard
            title="Export Students Lists"
            icon="file-export"
            onPress={handleExportStudentsList}
          />
          <ActionCard
            title="Edit Session"
            icon="account-edit"
            onPress={handleAddEditSession}
          />
          
        </View>
      </ScrollView>
      <Footer />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 30,
    color: "#006633",
  },
  cardContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 15,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    width: "48%",
    marginBottom: 20,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardText: {
    color: "#333",
    fontSize: 16,
    fontWeight: "600",
    marginTop: 10,
    textAlign: "center",
  },
});

export default UploadPage;