import * as React from 'react';
import { View, StyleSheet, Image, ScrollView, TouchableOpacity, ImageBackground } from 'react-native'
import CameraRoll from "@react-native-community/cameraroll";
import { ToggleButtonGroupHorizontal, TextInputGroupHorizontal, UneditableComponent } from '../../components/FormComponents/FormComponents'
import Geolocation from '@react-native-community/geolocation';
import auth from '@react-native-firebase/auth';
import database from '@react-native-firebase/database';
import storage from '@react-native-firebase/storage';
import { Button } from 'react-native-paper'
import { generateUUID } from '../../components/UserDataHandling/UserDataHandling'
import ActivityIndicator from '../../components/ActivityIndicator/ActivityIndicator'
import { googleMapAPIKey } from '../../config/config'


class FormScreen extends React.Component {

    static navigationOptions = ({ navigation }) => {
        const { params = {} } = navigation.state;
        return {
            headerTitle: 'Observation',
            headerStyle: {
                backgroundColor: '#4b8b3b',
            },
            headerTintColor: 'white',
            headerRight: () => <Button style={{ margin: 5 }} mode="contained" onPress={() => params.handlePress()}>Share</Button>
        }
    }

    constructor(props) {
        super(props);
        let date = new Date().toString().split(" ")
        date = date.splice(0, date.length - 2)
        this.state = {
            photos: this.props.navigation.getParam('dataUri'),
            location: ['', ''],
            activityIndicator: false,
            address: [],
            date: date,
            isAlive: 1,
            verified: false,
            notes: '',
            park: '',
            uid: '',
            type: '',
        };

    }

    componentDidMount() {
        this.findCoordinates()
        this.props.navigation.setParams({
            handlePress: () => this.uploadData(),
        });
    }

    uploadData = async function () {
        // Get the users ID
        console.log("Pressed")
        await this.setState({
            activityIndicator: true
        })
        const uid = auth().currentUser.uid;
        const uname = auth().currentUser.displayName
        const uimg = auth().currentUser.photoURL

        console.log(auth().currentUser)
        // Create a reference
        const ref = database().ref(`/usersObservations`);
        const randomID = generateUUID()
        console.log(randomID)
        const storageRef = storage().ref('/observations/' + randomID + '.jpeg')

        await storageRef.putFile(this.props.navigation.getParam('dataUri'))

        const url = await storageRef.getDownloadURL()
        console.log(url)
        let time = new Date().getTime();
        await ref.push({
            photoURL: url,
            isAlive: this.state.isAlive,
            location: this.state.location,
            time: time,
            isAlive: this.state.isAlive,
            address: this.state.address,
            verified: this.state.verified,
            notes: this.state.notes,
            park: this.state.park,
            uid: uid,
            uname: uname,
            uimg: uimg,
            type: this.state.type,

        });

        await this.setState({
            activityIndicator: false,
        })
       this.props.navigation.navigate('CameraViewScreen')

    }

    requestLocationPermission = async function () {
        try {
            const granted = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            );
            if (granted === PermissionsAndroid.RESULTS.GRANTED) {
                return true
            } else {
                return false
            }
        } catch (err) {
            return false
        }
    }

    findCoordinates = () => {
        if (this.requestLocationPermission) {
            Geolocation.getCurrentPosition(
                position => {
                    const initialPosition = position;
                    console.log(initialPosition)
                    const lon = initialPosition['coords']['longitude']
                    const lat = initialPosition['coords']['latitude']
                    console.log(lon, lat, googleMapAPIKey)
                    fetch('https://maps.googleapis.com/maps/api/geocode/json?address=' + lat + ',' + lon + '&key=' + googleMapAPIKey)
                        .then((response) => response.json())
                        .then((responseJson) => {
                            this.setState({
                                address: responseJson.results.length > 0 ? responseJson.results[0].formatted_address.split(","): "Unnamed location"
                            })
                            console.log('ADDRESS GEOCODE is BACK!! => ' + JSON.stringify(responseJson.results[0].formatted_address));
                        })
                    this.setState({ location: [initialPosition['coords']['longitude'], initialPosition['coords']['latitude']] });
                },
                error => console.log('Error', JSON.stringify(error)),
                { enableHighAccuracy: false },
            );
        }

    };

    FormComponentCallbackFunction = (childData) => {
        let type = childData[1]
        let obj = {}
        obj[type] = childData[0]
        this.setState(obj)

        console.log(this.state)

        console.log(childData[1] + ": " + childData[0])
    }

    render() {
        const { navigate } = this.props.navigation;
        return (
            <View style={styles.container}>
                <ImageBackground blurRadius={10} style={{ width: "100%" }} source={{ uri: this.props.navigation.getParam('dataUri') }}>
                    <TouchableOpacity
                        style={styles.imgHolder}
                        onPress={() => navigate('showPhoto', { img: this.props.navigation.getParam('dataUri') })}
                    >
                        <Image
                            style={{
                                width: 250,
                                height: 250,
                                borderRadius: 40
                            }}
                            source={{ uri: this.props.navigation.getParam('dataUri') }}
                        />
                    </TouchableOpacity>
                </ImageBackground>

                <View>
                    <ActivityIndicator title={"Uploading"} showIndicator={this.state.activityIndicator} />
                </View>

                <ScrollView>
                    <UneditableComponent
                        title={'Location'}
                        icon={'map-marker'}
                        values={this.state.address}
                    />
                    <UneditableComponent
                        title={'Date'}
                        icon={'calendar-clock'}
                        values={this.state.date}
                    />
                    <ToggleButtonGroupHorizontal
                        parentCallback={this.FormComponentCallbackFunction}
                        type={'isAlive'}
                        title={'Alive or Dead'}
                        values={['Alive', 'Dead']}
                        icon={'heart'}
                    />
                    <TextInputGroupHorizontal
                        title={'Notes (Optional)'}
                        type={'notes'}
                        parentCallback={this.FormComponentCallbackFunction}
                        multiline={true}
                        isNumeric={false}
                    />
                    <View style={{width: "100%", flexDirection: 'row-reverse'}}>
                        <Button style={{ height: 50, justifyContent: 'center', margin: 5, backgroundColor: 'green' }} mode="outlined" onPress={() => this.uploadData()}>Share</Button>
                    </View>
                </ScrollView>

            </View>
        );
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'flex-start',
        alignSelf: 'stretch',
        //backgroundColor: getRandomColor(),
    },
    welcome: {
        fontSize: 25
    },
    imgHolder: {
        marginLeft: 10,
        marginTop: 10,
        marginBottom: 10,
        width: "100%",
        justifyContent: 'center',

    },
    bottom: {
        flex: 1,
        justifyContent: 'flex-end',
        marginBottom: 10,
        marginLeft: 0,
        alignItems: 'center'
    }
})
export default FormScreen;
