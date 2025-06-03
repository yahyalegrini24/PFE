import React, { useState, useRef, useEffect, useContext } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
  Animated,
  Easing,
  Dimensions,
  ActivityIndicator,
  BackHandler,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Footer from "../../components/Footer";
import { UserContext } from "../../context/UserContext";
import { supabase } from "../../configuration/supabase";

const MarkAttendancePage = ({ route, navigation }) => {
  const { sessionId, courseName, groupId, groupName } = route.params;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [markedStudents, setMarkedStudents] = useState({});
  const [studentsList, setStudentsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasScrolledAll, setHasScrolledAll] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const { user } = useContext(UserContext);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Cleanup function to delete session and attendance
  const cleanupSession = async () => {
    try {
      // Delete attendance records first (foreign key constraint)
      const { error: attendanceError } = await supabase
        .from('Attendance')
        .delete()
        .eq('sessionId', sessionId);

      if (attendanceError) throw attendanceError;

      // Then delete the session
      const { error: sessionError } = await supabase
        .from('Session')
        .delete()
        .eq('sessionId', sessionId);

      if (sessionError) throw sessionError;

      console.log('Session and attendance records cleaned up');
      return true;
    } catch (error) {
      console.error('Error during cleanup:', error);
      Alert.alert('Error', 'Failed to cleanup session');
      return false;
    }
  };

  const saveAttendance = async (matricule, isPresent) => {
    try {
      const { data, error } = await supabase
        .from('Attendance')
        .upsert({
          matricule: matricule,
          sessionId: sessionId,
          presence: isPresent ? 1.0 : 0.0
        }, {
          onConflict: 'matricule,sessionId',
          ignoreDuplicates: false
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error saving attendance:', error);
      Alert.alert('Error', 'Failed to save attendance');
      return false;
    }
  };

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const { data, error } = await supabase
          .from('StudentGroup')
          .select(`
            matricule,
            Student (
              matricule,
              firstName,
              lastName
            )
          `)
          .eq('groupId', groupId);

        if (error) throw error;

        const mappedStudents = data.map(item => ({
          id: item.matricule,
          name: `${item.Student.firstName} ${item.Student.lastName || ''}`,
          group: groupId
        }));

        setStudentsList(mappedStudents);
      } catch (error) {
        console.error('Error fetching students:', error);
        Alert.alert('Error', 'Failed to load students');
      } finally {
        setLoading(false);
      }
    };

    if (groupId) {
      fetchStudents();
    }
  }, [groupId]);

  const student = studentsList[currentIndex];

  useEffect(() => {
    if (student) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [currentIndex, student]);

  const pulseAnimation = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.05,
        duration: 150,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 150,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  };

  const markPresent = async () => {
    pulseAnimation();
    const saved = await saveAttendance(student.id, true);
    if (saved) {
      setMarkedStudents({
        ...markedStudents,
        [student.id]: { status: 'present' }
      });
      if (currentIndex < studentsList.length - 1) {
        goNext();
      }
    }
  };

  const markAbsent = async () => {
    pulseAnimation();
    const saved = await saveAttendance(student.id, false);
    if (saved) {
      setMarkedStudents({
        ...markedStudents,
        [student.id]: { status: 'absent' }
      });
      Alert.alert("Success", `Marked ${student.name} as absent`);
      if (currentIndex < studentsList.length - 1) {
        goNext();
      }
    }
  };

  useEffect(() => {
    const checkExistingAttendance = async () => {
      if (!studentsList.length) return;
      
      try {
        const { data, error } = await supabase
          .from('Attendance')
          .select('matricule, presence')
          .eq('sessionId', sessionId.toString())
          .in('matricule', studentsList.map(s => s.id));

        if (error) throw error;

        const existingMarks = {};
        data.forEach(record => {
          existingMarks[record.matricule] = {
            status: record.presence === 1.0 ? 'present' : 'absent'
          };
        });

        setMarkedStudents(existingMarks);
      } catch (error) {
        console.error('Error fetching existing attendance:', error);
      }
    };

    checkExistingAttendance();
  }, [sessionId, studentsList]);

  const goNext = () => {
    if (currentIndex < studentsList.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
    if (currentIndex + 1 === studentsList.length - 1) {
      setHasScrolledAll(true);
    }
  };

  const goPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const finishSession = async () => {
    try {
      const { error } = await supabase
        .from('Session')
        .update({ confirm: 1 })
        .eq('sessionId', sessionId);

      if (error) throw error;

      Alert.alert(
        "Success",
        "Session completed successfully!",
        [
          {
            text: "OK",
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (error) {
      console.error('Error confirming session:', error);
      Alert.alert('Error', 'Failed to complete session');
    }
  };

  // Exit session with cleanup
  const exitSession = async () => {
    setShowExitConfirm(false);
    const cleaned = await cleanupSession();
    if (cleaned) {
      Alert.alert(
        "Session Cancelled",
        "The session has been cancelled and all records have been deleted.",
        [
          {
            text: "OK",
            onPress: () => navigation.goBack()
          }
        ]
      );
    }
  };

  const showExitConfirmation = () => {
    setShowExitConfirm(true);
    Alert.alert(
      "Exit Attendance",
      "This will cancel the current session and delete all attendance records. Are you sure you want to continue?",
      [
        {
          text: "Continue Session",
          style: "cancel",
          onPress: () => setShowExitConfirm(false)
        },
        {
          text: "Cancel Session",
          style: "destructive",
          onPress: exitSession
        }
      ],
      { cancelable: false }
    );
  };

  // Handle hardware back button
  useEffect(() => {
    const handleBackPress = () => {
      showExitConfirmation();
      return true; // Prevent default back button behavior
    };

    BackHandler.addEventListener("hardwareBackPress", handleBackPress);

    return () => {
      BackHandler.removeEventListener("hardwareBackPress", handleBackPress);
    };
  }, []);

  const studentStatus = student ? markedStudents[student.id]?.status : null;
  const isPresent = studentStatus === 'present';
  const isAbsent = studentStatus === 'absent';
  
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#006633" />
          <Text style={styles.loadingText}>Loading students...</Text>
        </View>
        <Footer />
      </SafeAreaView>
    );
  }

  if (!student) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>No students available</Text>
        </View>
        <Footer />
      </SafeAreaView>
    );
  }

  return (
    <>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#006633" />
  
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Mark Attendance</Text>
          <Text style={styles.subtitle}>Course: {courseName}</Text>
        </View>
  
        {/* Student card */}
        <Animated.View
          style={[
            styles.studentCard,
            {
              opacity: fadeAnim,
              transform: [
                { translateX: slideAnim },
                { scale: scaleAnim }
              ]
            },
            isPresent && styles.studentCardPresent,
            isAbsent && styles.studentCardAbsent
          ]}
        >
          <View style={styles.studentIdBadge}>
            <Text style={styles.studentIdText}>{student.id}</Text>
          </View>
  
          <Text style={styles.studentName}>{student.name}</Text>
          <View style={styles.divider} />
  
          <View style={styles.detailsContainer}>
            <View style={styles.detailItem}>
              <Ionicons name="people-outline" size={20} color="#006633" />
              <Text style={styles.studentDetails}>{groupName}</Text>
            </View>
  
            {isPresent && (
              <View style={styles.markedBadge}>
                <Ionicons name="checkmark-circle" size={18} color="#ffffff" />
                <Text style={styles.markedText}>Present</Text>
              </View>
            )}
  
            {isAbsent && (
              <View style={[styles.markedBadge, styles.absentBadge]}>
                <Ionicons name="close-circle" size={18} color="#ffffff" />
                <Text style={styles.markedText}>Absent</Text>
              </View>
            )}
          </View>
        </Animated.View>
  
        {/* Action buttons */}
        <View style={styles.attendanceButtonsContainer}>
          <TouchableOpacity
            style={[
              styles.attendanceButton,
              styles.presentButton,
              isPresent && styles.attendanceButtonActive
            ]}
            onPress={markPresent}
          >
            <Ionicons
              name={isPresent ? "checkmark-circle" : "checkmark-circle-outline"}
              size={24}
              color="white"
            />
            <Text style={styles.attendanceButtonText}>
              {isPresent ? "Marked Present" : "Present"}
            </Text>
          </TouchableOpacity>
  
          <TouchableOpacity
            style={[
              styles.attendanceButton,
              styles.absentButton,
              isAbsent && styles.attendanceButtonActive
            ]}
            onPress={markAbsent}
          >
            <Ionicons
              name={isAbsent ? "close-circle" : "close-circle-outline"}
              size={24}
              color="white"
            />
            <Text style={styles.attendanceButtonText}>
              {isAbsent ? "Marked Absent" : "Absent"}
            </Text>
          </TouchableOpacity>
        </View>
  
        {/* Navigation */}
        <View style={styles.navigation}>
          <TouchableOpacity
            style={[styles.navButton, currentIndex === 0 && styles.disabledButton]}
            onPress={goPrevious}
            disabled={currentIndex === 0}
          >
            <Ionicons name="arrow-back" size={20} color="white" />
            <Text style={styles.navButtonText}>Previous</Text>
          </TouchableOpacity>
  
          <Text style={styles.counterText}>
            {currentIndex + 1} / {studentsList.length}
          </Text>
  
          <TouchableOpacity
            style={[
              styles.navButton,
              currentIndex === studentsList.length - 1 && styles.disabledButton,
            ]}
            onPress={goNext}
            disabled={currentIndex === studentsList.length - 1}
          >
            <Text style={styles.navButtonText}>Next</Text>
            <Ionicons name="arrow-forward" size={20} color="white" />
          </TouchableOpacity>
        </View>

        {/* Finish Session button (conditionally rendered) */}
        {hasScrolledAll && (
          <TouchableOpacity
            style={styles.finishButton}
            onPress={finishSession}
          >
            <View style={styles.finishButtonContent}>
              <View style={styles.finishButtonIconContainer}>
                <Ionicons name="checkmark-done-circle" size={28} color="white" />
              </View>
              <View style={styles.finishButtonTextContainer}>
                <Text style={styles.finishButtonText}>Finish Session</Text>
                <Text style={styles.finishButtonSubtext}>Complete and confirm attendance</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}

        {/* Exit Button */}
        <View style={styles.exitButtonContainer}>
          <TouchableOpacity
            style={styles.exitButton}
            onPress={showExitConfirmation}
          >
            <Text style={styles.exitButtonText}>Exit Attendance</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
      <Footer />
    </>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
    paddingHorizontal: 20,
  },
  header: {
    alignItems: "center",
    marginTop: 20,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#006633",
  },
  subtitle: {
    fontWeight: 'bold',
    color: "#6c757d",
    marginTop: 5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#006633",
  },
  studentCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 25,
    width: "100%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 25,
    position: "relative",
  },
  studentCardPresent: {
    borderLeftWidth: 5,
    borderLeftColor: "#006633",
  },
  studentCardAbsent: {
    borderLeftWidth: 5,
    borderLeftColor: "#dc3545",
  },
  studentIdBadge: {
    position: "absolute",
    top: 10,
    right: 15,
    backgroundColor: "#f1f3f5",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  studentIdText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#6c757d",
  },
  studentName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#212529",
    marginTop: 10,
    marginBottom: 15,
    textAlign: "center",
  },
  divider: {
    height: 1,
    backgroundColor: "#e9ecef",
    width: "100%",
    marginBottom: 15,
  },
  detailsContainer: {
    width: "100%",
    alignItems: "center",
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
  },
  studentDetails: {
    fontSize: 16,
    color: "#495057",
    marginLeft: 8,
  },
  markedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#006633",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 10,
  },
  absentBadge: {
    backgroundColor: "#dc3545",
  },
  markedText: {
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
    marginLeft: 5,
  },
  attendanceButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 25,
    width: "100%",
  },
  attendanceButton: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
    flex: 1,
    marginHorizontal: 5,
  },
  presentButton: {
    backgroundColor: "#006633",
    shadowColor: "#006633",
  },
  absentButton: {
    backgroundColor: "#dc3545",
    shadowColor: "#dc3545",
  },
  attendanceButtonActive: {
    opacity: 0.9,
  },
  attendanceButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 8,
  },
  navigation: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
  },
  navButton: {
    backgroundColor: "#006633",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    width: width * 0.35,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    shadowColor: "#3a86ff",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  navButtonText: {
    color: "white",
    fontSize: 15,
    fontWeight: "bold",
    marginHorizontal: 8,
  },
  disabledButton: {
    backgroundColor: "#ced4da",
    shadowOpacity: 0,
  },
  counterText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#6c757d",
  },
  finishButton: {
    backgroundColor: '#006633',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  finishButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  finishButtonIconContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 50,
    padding: 12,
    marginRight: 15,
  },
  finishButtonTextContainer: {
    flex: 1,
  },
  finishButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  finishButtonSubtext: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
  },
  exitButtonContainer: {
    marginTop: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  exitButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  exitButtonText: {
    color: '#6c757d',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});

export default MarkAttendancePage;