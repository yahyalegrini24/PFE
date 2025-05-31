import React, { useContext, useState, useEffect } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions,
  SafeAreaView, StatusBar, ActivityIndicator, Image, Alert
} from "react-native";
import { UserContext } from "../../context/UserContext";
import { Ionicons } from "@expo/vector-icons";
import Footer from "../../components/Footer";
import { supabase } from "../../configuration/supabase";

const { width } = Dimensions.get("window");
const isLargeScreen = width > 768;

const HomePage = ({ navigation }) => {
  const { user } = useContext(UserContext);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSessions = async () => {
      if (!user?.teacherId) return;

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('Session_structure')
          .select(`
            moduleId,
            classId,
            groupId,
            teacherId,
            dayId,
            Session_structure_id,
            typeId,
            TimeId,
            Day:dayId (dayId, dayName),
            Module:moduleId (moduleId, moduleName),
            Group:groupId (
              groupId,
              groupName,
              Section:sectionId (
                sectionId,
                sectionName,
                SchoolYear:yearId (
                  yearId,
                  yearName,
                  Degree:degreeId (
                    degreeId,
                    degreeName
                  )
                )
              )
            ),
            GroupType:typeId (typeId, typeName),
            Classroom:classId (classId, ClassNumber, Location),
            SessionTime:TimeId (TimeId ,label)
          `)
          .eq('teacherId', user.teacherId)
          .order('dayId', { ascending: true });
        console.log('Fetched sessions:', data);
        if (error) throw error;

        const currentDayName = new Date().toLocaleString('en-US', { weekday: 'long' });
        const todaySessions = data.filter(session => session.Day.dayName === currentDayName);
        setSessions(todaySessions || []);
      } catch (error) {
        console.error('Error fetching sessions:', error);
        Alert.alert('Error', 'Failed to load sessions');
      } finally {
        setLoading(false);
      }
    };

    loadSessions();
  }, [user]);

  const generateSessionId = (sessionStructureId) => {
    const randomNumbers = Math.floor(100 + Math.random() * 900);
    return `${sessionStructureId}${randomNumbers}`;
  };

  const handleSessionPress = async (session) => {
    Alert.alert(
      `${session.Module.moduleName} - Session`,
      `Would you like to start attendance for:\n\n` +
      `📚 Group: ${session.Group.groupName}\n` +
      `📅 Day: ${session.Day.dayName}\n` +
      `⏰ Time: ${session.SessionTime?.startTime || 'N/A'} - ${session.SessionTime?.endTime || 'N/A'}\n` +
      `🏛️ Room: ${session.Classroom.Location} - ${session.Classroom.ClassNumber}`,
      [
        {
          text: "Cancel",
          style: "cancel",
          isPreferred: false,
        },
        {
          text: "Start Attendance",
          style: "default",
          isPreferred: true,
          onPress: async () => {
            try {
              setLoading(true);

              const { data: lastSession, error: lastSessionError } = await supabase
                .from('Session')
                .select('sessionNumber')
                .eq('moduleId', session.moduleId)
                .eq('groupId', session.groupId)
                .order('sessionNumber', { ascending: false })
                .limit(1)
                .single();

              if (lastSessionError && lastSessionError.code !== 'PGRST116') {
                throw lastSessionError;
              }

              const nextSessionNumber = (lastSession?.sessionNumber || 0) + 1;
              const sessionId = generateSessionId(session.Session_structure_id);

              const { data: newSession, error } = await supabase
                .from('Session')
                .insert({
                  sessionId: sessionId,
                  sessionNumber: nextSessionNumber,
                  moduleId: session.moduleId,
                  classId: session.classId,
                  groupId: session.groupId,
                  teacherId: user.teacherId,
                  dayId: session.dayId,
                  TimeId: session.TimeId,
                  date: new Date().toISOString()
                })
                .select()
                .single();

              if (error) throw error;

              navigation.navigate("Attendancy", {
                sessionId: newSession.sessionId,
                courseName: session.Module.moduleName,
                groupId: session.Group.groupId,
                groupName: session.Group.groupName,
                moduleId: session.moduleId,
                dayId: session.dayId,
                timeId: session.TimeId
              });
            } catch (error) {
              console.error('Error creating session:', error);
              Alert.alert('Error', 'Failed to create session. Please try again.');
            } finally {
              setLoading(false);
            }
          }
        }
      ],
      {
        cancelable: true,
        userInterfaceStyle: 'light'
      }
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.welcomeText}>Welcome, Professor!</Text>
            <Text style={styles.subtitle}>Select a session to mark attendance</Text>
          </View>
          <TouchableOpacity
            style={styles.profileContainer}
            onPress={() => navigation.navigate("Profile")}
          >
            <Image
              source={{ uri: user?.photoURL || "https://via.placeholder.com/50" }}
              style={styles.profileImage}
            />
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#006633" />
        ) : (
          <View style={styles.courseListContainer}>
            {sessions.map((session) => (
              <TouchableOpacity
                key={`${session.moduleId}-${session.groupId}-${session.dayId}`}
                style={styles.courseCard}
                onPress={() => handleSessionPress(session)}
              >
                <View style={styles.courseInfo}>
                  <Text style={styles.courseName}>{session.Module.moduleName}</Text>
                  <Text style={styles.courseCode}>
                    {session.Group.groupName} - {session.Group.Section.SchoolYear.yearName}
                  </Text>
                  <Text style={styles.courseTimeText}>
                    {session.Day.dayName} | {session.GroupType?.typeName || 'N/A'} | 
                    {session.SessionTime ? ` ${session.SessionTime.startTime}-${session.SessionTime.endTime} |` : ''}
                    Room: {session.Classroom.Location} - {session.Classroom.ClassNumber}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#006633" />
              </TouchableOpacity>
            ))}
            {sessions.length === 0 && (
              <Text style={styles.noSessionsText}>No sessions found</Text>
            )}
          </View>
        )}
      </ScrollView>
      <Footer />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  headerTextContainer: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
  },
  profileContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: "hidden",
    backgroundColor: "#ccc",
  },
  profileImage: {
    width: "100%",
    height: "100%",
  },
  courseListContainer: {
    flexDirection: isLargeScreen ? "row" : "column",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  courseCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    width: isLargeScreen ? "48%" : "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    cursor: "pointer",
  },
  courseInfo: {
    flex: 1,
  },
  courseName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  courseCode: {
    fontSize: 14,
    color: "#666",
  },
  courseTimeText: {
    fontSize: 14,
    color: "#006633",
  },
  noSessionsText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
    fontStyle: 'italic'
  }
});

export default HomePage;