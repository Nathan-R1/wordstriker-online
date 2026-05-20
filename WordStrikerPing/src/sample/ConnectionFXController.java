package sample;

import javafx.animation.KeyFrame;
import javafx.animation.KeyValue;
import javafx.animation.Timeline;
import javafx.fxml.FXML;
import javafx.geometry.VPos;
import javafx.scene.Scene;
import javafx.scene.control.Button;
import javafx.scene.control.CheckBox;
import javafx.scene.control.TextArea;
import javafx.scene.control.TextField;
import javafx.scene.layout.Pane;
import javafx.scene.paint.Color;
import javafx.scene.text.Font;
import javafx.scene.text.Text;
import javafx.util.Duration;

public class ConnectionFXController {

    public static int PORT = 4444;
    private SocketClient sc;
    private SocketServer ss;

    private boolean CLIENT = true;

    @FXML
    private TextField textField;
    @FXML
    private Button sendButton;
    @FXML
    private Button connectButton;

    @FXML
    private Pane root;
    @FXML
    private Pane transitionPane;

    public void connect(String server, Boolean client) {

        sendButton.setDefaultButton(true);
        sendButton.setOnAction(e -> send());

        CLIENT = client;

        if (CLIENT) {
            connectButton.setText("CLIENT");
            sc = new SocketClient();
            // put into a thread so the gui still runs while we are listening
            Thread one = new Thread(() -> sc.connect(server, PORT, this));

            one.start();
        } else {
            connectButton.setText("SERVER");
            ss = new SocketServer();
            // put into a thread so the gui still runs while we are listening
            Thread one = new Thread(() -> ss.connect(PORT, this));

            one.start();
        }
    }

    @FXML
    private void send() {
        if (CLIENT) {
            if (sc != null) {
                sc.send(textField.getText());
                textField.setText("");
            }
        } else {
            if (ss != null) {
                ss.send(textField.getText());
                textField.setText("");
            }
        }
    }

    @FXML
    public void printText(String s) {
        Text msg = new Text(s);
        msg.setY(50);
        msg.setTextOrigin(VPos.CENTER);
        msg.setFont(Font.font(24));
        msg.setFill(Color.WHITE);

        transitionPane.getChildren().add(msg);

        Scene scene = root.getScene();

        double sceneWidth = scene.getWidth();
        double msgWidth = msg.getLayoutBounds().getWidth();

        KeyValue initKeyValue = new KeyValue(msg.translateXProperty(), -msgWidth);
        KeyFrame initFrame = new KeyFrame(Duration.ZERO, initKeyValue);

        KeyValue endKeyValue = new KeyValue(msg.translateXProperty(), sceneWidth);
        KeyFrame endFrame = new KeyFrame(Duration.seconds(3), endKeyValue);

        Timeline timeline = new Timeline(initFrame, endFrame);

        timeline.setCycleCount(1);
        timeline.play();
    }
}
