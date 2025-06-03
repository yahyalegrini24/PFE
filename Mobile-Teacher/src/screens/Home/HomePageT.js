import React, { useContext, useState, useEffect, useCallback } from "react";
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
  
  // New state variables for semester logic
  const [academicYears, setAcademicYears] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [currentSemester, setCurrentSemester] = useState(null);

  // Fetch Academic Years
  const fetchAcademicYears = async () => {
    try {
      const { data, error } = await supabase
        .from('AcademicYear')
        .select('*')
        .order('AcademicId', { ascending: true });

      if (error) throw error;
      setAcademicYears(data || []);
    } catch (error) {
      console.error("Error fetching academic years:", error);
    }
  };

  // Determine current semester based on current date and semester intervals
  const determineCurrentSemester = useCallback(() => {
    const currentDate = new Date();
    
    const currentSem = semesters.find(semester => {
      if (!semester.StartDate || !semester.EndDate) return false;
      
      const startDate = new Date(semester.StartDate);
      const endDate = new Date(semester.EndDate);
      
      return currentDate >= startDate && currentDate <= endDate;
    });

    if (currentSem) {
      setCurrentSemester(currentSem);
      return currentSem;
    } else {
      setCurrentSemester(null);
      return null;
    }
  }, [semesters]);

  // Call determineCurrentSemester when semesters are loaded
  useEffect(() => {
    if (semesters.length > 0) {
      determineCurrentSemester();
    }
  }, [semesters, determineCurrentSemester]);

  useEffect(() => {
    const loadData = async () => {
      if (!user?.teacherId) return;

      setLoading(true);
      try {
        // Fetch academic years if not already loaded
        if (academicYears.length === 0) {
          await fetchAcademicYears();
        }

        // Fetch semesters with academic year info
        const { data: semesterData, error: semesterError } = await supabase
          .from('Semestre')
          .select('SemesterId, label, StartDate, EndDate, AcademicId')
          .order('StartDate', { ascending: false });

        if (semesterError) throw semesterError;
        setSemesters(semesterData || []);

        // Fetch sessions with module semester information
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
            Module:moduleId (
              moduleId, 
              moduleName, 
              SemesterId,
              Semester:SemesterId (
                SemesterId, 
                label, 
                StartDate, 
                EndDate, 
                AcademicId
              )
            ),
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
            SessionTime:TimeId (TimeId, label)
          `)
          .eq('teacherId', user.teacherId)
          .order('dayId', { ascending: true });

        console.log('Fetched sessions:', data);
        if (error) throw error;

        // Store all sessions initially
        const allSessions = data || [];
        
        // Filter by current day and ensure valid module data
        const currentDayName = new Date().toLocaleString('en-US', { weekday: 'long' });
        const todaySessions = allSessions.filter(session => 
          session.Day?.dayName === currentDayName && 
          session.Module && 
          session.Module.moduleName
        );
        
        setSessions(todaySessions);
      } catch (error) {
        console.error('Error fetching data:', error);
        Alert.alert('Error', 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user, academicYears]);

  // Filter sessions based on current semester
  useEffect(() => {
    const filterSessionsBySemester = async () => {
      if (!currentSemester || !user?.teacherId) return;

      try {
        // Re-fetch sessions filtered by current semester
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
            Module:moduleId (
              moduleId, 
              moduleName, 
              SemesterId,
              Semester:SemesterId (
                SemesterId, 
                label, 
                StartDate, 
                EndDate, 
                AcademicId
              )
            ),
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
            SessionTime:TimeId (TimeId, label)
          `)
          .eq('teacherId', user.teacherId)
          .eq('Module.SemesterId', currentSemester.SemesterId)
          .order('dayId', { ascending: true });

        if (error) throw error;

        // Filter by current day and ensure valid module data
        const currentDayName = new Date().toLocaleString('en-US', { weekday: 'long' });
        const todaySessions = (data || []).filter(session => 
          session.Day?.dayName === currentDayName && 
          session.Module && 
          session.Module.moduleName &&
          session.Module.SemesterId === currentSemester.SemesterId
        );
        
        setSessions(todaySessions);
      } catch (error) {
        console.error('Error filtering sessions by semester:', error);
      }
    };

    filterSessionsBySemester();
  }, [currentSemester, user]);

  const generateSessionId = (sessionStructureId) => {
    const randomNumbers = Math.floor(100 + Math.random() * 900);
    return `${sessionStructureId}${randomNumbers}`;
  };

  const handleSessionPress = async (session) => {
    // Add null checks for session data
    if (!session.Module?.moduleName || !session.Group?.groupName) {
      Alert.alert('Error', 'Session data is incomplete. Please try again.');
      return;
    }

    Alert.alert(
      `${session.Module.moduleName} - Session`,
      `Would you like to start attendance for:\n\n` +
      `📚 Group: ${session.Group.groupName}\n` +
      `📅 Day: ${session.Day?.dayName || 'Unknown'}\n` +
      `⏰ Time: ${session.SessionTime?.label || 'N/A'}\n` +
      `🏛️ Room: ${session.Classroom?.Location || 'Unknown'} - ${session.Classroom?.ClassNumber || 'Unknown'}`,
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
            <Text style={styles.subtitle}>
             Select a session to mark attendance
            </Text>
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

        {/* Current Semester Display */}
        {currentSemester && (
          <View style={styles.semesterContainer}>
            <View style={styles.semesterInfo}>
              <Ionicons name="calendar-outline" size={20} color="#006633" />
              <Text style={styles.semesterText}>{currentSemester.label}</Text>
            </View>
          </View>
        )}

        {loading ? (
          <ActivityIndicator size="large" color="#006633" />
        ) : (
          <View style={styles.courseListContainer}>
            {sessions.map((session) => {
              // Additional safety checks
              if (!session.Module?.moduleName || !session.Group?.groupName) {
                return null;
              }
              
              return (
                <TouchableOpacity
                  key={`${session.moduleId}-${session.groupId}-${session.dayId}`}
                  style={styles.courseCard}
                  onPress={() => handleSessionPress(session)}
                >
                  <View style={styles.courseInfo}>
                    <Text style={styles.courseName}>{session.Module.moduleName}</Text>
                    <Text style={styles.courseCode}>
                      {session.Group.groupName} - {session.Group.Section?.SchoolYear?.yearName || 'Unknown Year'}
                    </Text>
                    <Text style={styles.courseTimeText}>
                      {session.Day?.dayName || 'Unknown Day'} | {session.GroupType?.typeName || 'N/A'} | 
                      Room: {session.Classroom?.Location || 'Unknown'} - {session.Classroom?.ClassNumber || 'Unknown'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={24} color="#006633" />
                </TouchableOpacity>
              );
            }).filter(Boolean)}
            {sessions.length === 0 && !loading && (
              <View style={styles.noSessionsContainer}>
                <Ionicons name="calendar-outline" size={48} color="#ccc" />
                <Text style={styles.noSessionsText}>
                  {currentSemester 
                    ? `No sessions scheduled for today in ${currentSemester.label}`
                    : "No sessions found for today"}
                </Text>
              </View>
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
  semesterContainer: {
    backgroundColor: "#e8f5e8",
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: "#006633",
  },
  semesterInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  semesterText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#006633",
    marginLeft: 8,
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
    marginBottom: 2,
  },
  courseTimeText: {
    fontSize: 14,
    color: "#006633",
    marginBottom: 2,
  },
  semesterLabel: {
    fontSize: 12,
    color: "#888",
    fontStyle: "italic",
  },
  noSessionsContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    width: "100%",
  },
  noSessionsText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
    fontStyle: 'italic',
    paddingHorizontal: 20,
  }
});

export default HomePage;